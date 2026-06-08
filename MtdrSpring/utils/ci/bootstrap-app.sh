#!/usr/bin/env bash
# Re-creates everything the app needs on top of freshly-provisioned infra so a
# deploy works even after a full `terraform destroy`. Every step is idempotent,
# so it is safe to run on every push.
#
# Steps:
#   1. Generate kubeconfig for the OKE cluster and wait for nodes.
#   2. Ensure the mtdrworkshop namespace exists.
#   3. Set the ATP ADMIN password to DB_ADMIN_PASSWORD.
#   4. Download the DB wallet and create the db-wallet-secret.
#   5. Bootstrap the TODOUSER schema + todoitem table.
#   6. Create the dbuser / frontendadmin / app-env / oci-registry-secret secrets.
#
# Required env vars:
#   OCI_REGION OCI_NAMESPACE TF_VAR_ociCompartmentOcid
#   MTDR_DB_NAME (= TODO_PDB_NAME)  DB_ADMIN_PASSWORD  UI_PASSWORD
#   OCI_USERNAME OCI_AUTH_TOKEN              (for the OCIR image-pull secret)
# Optional:
#   CLUSTER_ID  (else looked up by display name in the compartment)
#   DB_DISPLAY_NAME (default MTDRDB)
#   OPEN_ROUTER_API_KEY TELEGRAM_BOT_TOKEN TELEGRAM_BOT_NAME  (app-env secret;
#     blank if unset). JWT_SECRET is NOT read here -- it is generated once and
#     reused from the existing app-env secret on later deploys.
set -euo pipefail

: "${OCI_REGION:?}" ; : "${OCI_NAMESPACE:?}" ; : "${TF_VAR_ociCompartmentOcid:?}"
: "${MTDR_DB_NAME:?}" ; : "${DB_ADMIN_PASSWORD:?}" ; : "${UI_PASSWORD:?}"
: "${OCI_USERNAME:?}" ; : "${OCI_AUTH_TOKEN:?}"
NS=mtdrworkshop
DB_DISPLAY_NAME="${DB_DISPLAY_NAME:-MTDRDB}"
COMPARTMENT="$TF_VAR_ociCompartmentOcid"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

# ---------------------------------------------------------------------------
# 1. kubeconfig
# ---------------------------------------------------------------------------
if [ -z "${CLUSTER_ID:-}" ]; then
  echo "Looking up OKE cluster id in compartment..."
  CLUSTER_ID=$(oci ce cluster list --compartment-id "$COMPARTMENT" \
    --lifecycle-state ACTIVE --query "data[0].id" --raw-output)
fi
echo "Cluster: $CLUSTER_ID"
mkdir -p "$HOME/.kube"
oci ce cluster create-kubeconfig --cluster-id "$CLUSTER_ID" \
  --file "$HOME/.kube/config" --region "$OCI_REGION" --token-version 2.0.0 \
  --kube-endpoint PUBLIC_ENDPOINT

echo "Waiting for at least 1 Ready node..."
for _ in $(seq 1 60); do
  READY=$(kubectl get nodes --no-headers 2>/dev/null | grep -c ' Ready ' || true)
  [ "${READY:-0}" -ge 1 ] && break
  sleep 10
done
kubectl get nodes || true

# ---------------------------------------------------------------------------
# 2. namespace
# ---------------------------------------------------------------------------
kubectl get ns "$NS" >/dev/null 2>&1 || kubectl create ns "$NS"

# ---------------------------------------------------------------------------
# 3. ATP admin password + DB OCID
# ---------------------------------------------------------------------------
# Match by display name, excluding TERMINATED (deleted) DBs. display_name is
# not unique, so a leftover duplicate would otherwise be silently concatenated
# into one bad OCID. Require exactly one match and fail loudly with the list
# (e.g. delete the non-Terraform-managed duplicate) instead of 404ing later.
DB_SELECTOR="data[?\"display-name\"=='${DB_DISPLAY_NAME}' && \"lifecycle-state\"!='TERMINATED']"
DB_COUNT=$(oci db autonomous-database list --compartment-id "$COMPARTMENT" \
  --query "length(${DB_SELECTOR})" --raw-output 2>/dev/null || echo 0)
if [ "${DB_COUNT:-0}" -ne 1 ]; then
  echo "ERROR: expected exactly 1 ATP DB named ${DB_DISPLAY_NAME}, found ${DB_COUNT}." >&2
  echo "If more than one, delete the duplicate so only the Terraform-managed DB remains:" >&2
  oci db autonomous-database list --compartment-id "$COMPARTMENT" \
    --query "${DB_SELECTOR}.{name:\"display-name\",state:\"lifecycle-state\",id:id}" \
    --output table >&2 || true
  exit 1
fi
DB_OCID=$(oci db autonomous-database list --compartment-id "$COMPARTMENT" \
  --query "${DB_SELECTOR} | [0].id" --raw-output)
echo "ATP DB: $DB_OCID"

umask 177
printf '{"adminPassword": "%s"}' "$DB_ADMIN_PASSWORD" > "$WORKDIR/pw.json"
umask 22
# Idempotent: re-running within 24h tries to set the same password, which
# Oracle's password-history policy rejects ("one of the last four passwords...
# set less than 24 hours ago"). That error means it's ALREADY this password, so
# treat it as success; the ADMIN-login wait below still verifies it works.
if oci db autonomous-database update --autonomous-database-id "$DB_OCID" \
     --from-json "file://$WORKDIR/pw.json" >/dev/null 2>"$WORKDIR/pwerr"; then
  echo "ATP ADMIN password set."
elif grep -qi "last four passwords\|less than 24 hours" "$WORKDIR/pwerr"; then
  echo "ATP ADMIN password already set recently; keeping it."
else
  cat "$WORKDIR/pwerr" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 4. wallet -> db-wallet-secret
# ---------------------------------------------------------------------------
WALLET="$WORKDIR/wallet"
mkdir -p "$WALLET"
oci db autonomous-database generate-wallet --autonomous-database-id "$DB_OCID" \
  --file "$WALLET/wallet.zip" --password 'Welcome1' --generate-type ALL
unzip -o "$WALLET/wallet.zip" -d "$WALLET" >/dev/null
cat > "$WALLET/sqlnet.ora" <<EOF
WALLET_LOCATION = (SOURCE = (METHOD = file) (METHOD_DATA = (DIRECTORY="/mtdrworkshop/creds")))
SSL_SERVER_DN_MATCH=yes
EOF

kubectl create secret generic db-wallet-secret -n "$NS" \
  --from-file=README="$WALLET/README" \
  --from-file=cwallet.sso="$WALLET/cwallet.sso" \
  --from-file=ewallet.p12="$WALLET/ewallet.p12" \
  --from-file=keystore.jks="$WALLET/keystore.jks" \
  --from-file=ojdbc.properties="$WALLET/ojdbc.properties" \
  --from-file=sqlnet.ora="$WALLET/sqlnet.ora" \
  --from-file=tnsnames.ora="$WALLET/tnsnames.ora" \
  --from-file=truststore.jks="$WALLET/truststore.jks" \
  --dry-run=client -o yaml | kubectl apply -n "$NS" -f -

# ---------------------------------------------------------------------------
# 5. schema bootstrap (idempotent)
# ---------------------------------------------------------------------------
export TNS_ADMIN="$WALLET"
cat > "$TNS_ADMIN/sqlnet.ora" <<EOF
WALLET_LOCATION = (SOURCE = (METHOD = file) (METHOD_DATA = (DIRECTORY="$TNS_ADMIN")))
SSL_SERVER_DN_MATCH=yes
EOF

# Wait until the DB accepts the new admin password (update can lag).
SVC="${MTDR_DB_NAME}_tp"
echo "Waiting for DB to accept ADMIN login on $SVC..."
for _ in $(seq 1 30); do
  if echo "exit" | sqlplus -L -S admin/"$DB_ADMIN_PASSWORD"@"$SVC" >/dev/null 2>&1; then
    break
  fi
  sleep 10
done

sqlplus -L -S admin/"$DB_ADMIN_PASSWORD"@"$SVC" <<EOF
WHENEVER SQLERROR EXIT 1
set serveroutput on
declare
  n number;
begin
  select count(*) into n from dba_users where username = 'TODOUSER';
  if n = 0 then
    execute immediate 'CREATE USER TODOUSER IDENTIFIED BY "${DB_ADMIN_PASSWORD}" DEFAULT TABLESPACE data QUOTA UNLIMITED ON data';
    execute immediate 'GRANT CREATE SESSION, CREATE VIEW, CREATE SEQUENCE, CREATE PROCEDURE TO TODOUSER';
    execute immediate 'GRANT CREATE TABLE, CREATE TRIGGER, CREATE TYPE, CREATE MATERIALIZED VIEW TO TODOUSER';
    execute immediate 'GRANT CONNECT, RESOURCE, pdb_dba, SODA_APP TO TODOUSER';
  else
    begin
      execute immediate 'ALTER USER TODOUSER IDENTIFIED BY "${DB_ADMIN_PASSWORD}"';
    exception
      -- ORA-28007: password cannot be reused. 26ai's default profile enforces
      -- password-reuse rules, so re-setting the same password fails. That means
      -- it is already the desired password, so ignore it and keep going.
      when others then
        if sqlcode != -28007 then raise; end if;
    end;
  end if;
end;
/
declare
  n number;
begin
  select count(*) into n from all_tables where owner = 'TODOUSER' and table_name = 'TODOITEM';
  if n = 0 then
    execute immediate 'CREATE TABLE TODOUSER.todoitem (id NUMBER GENERATED ALWAYS AS IDENTITY, description VARCHAR2(4000), creation_ts TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, done NUMBER(1,0), PRIMARY KEY (id))';
    execute immediate q'[insert into TODOUSER.todoitem (description, done) values ('Manual item insert', 0)]';
    commit;
  end if;
end;
/
exit
EOF
echo "Schema ready."

# ---------------------------------------------------------------------------
# 6. application secrets
# ---------------------------------------------------------------------------
# App connects as TODOUSER using the same password.
kubectl create secret generic dbuser -n "$NS" \
  --from-literal=dbpassword="$DB_ADMIN_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -n "$NS" -f -

kubectl create secret generic frontendadmin -n "$NS" \
  --from-literal=password="$UI_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -n "$NS" -f -

# app-env is referenced via envFrom WITHOUT optional:true, so it must exist.
# Its keys MUST match the ${...} names in application.properties so envFrom
# injects them as the env vars the app reads.
#
# JWT secret: generated once, then reused on every later deploy by reading it
# back from the existing secret. Stable across the 2 replicas and restarts, so
# you never set it by hand. (The app base64-decodes it into the HMAC key.)
JWT_SECRET="$(kubectl get secret app-env -n "$NS" \
  -o jsonpath='{.data.JWT_SECRET}' 2>/dev/null | base64 -d || true)"
if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET="$(openssl rand -base64 48)"
  echo "Generated a new JWT secret."
else
  echo "Reusing existing JWT secret."
fi

kubectl create secret generic app-env -n "$NS" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=OPEN_ROUTER_API_KEY="${OPEN_ROUTER_API_KEY:-}" \
  --from-literal=TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}" \
  --from-literal=TELEGRAM_BOT_NAME="${TELEGRAM_BOT_NAME:-}" \
  --dry-run=client -o yaml | kubectl apply -n "$NS" -f -

# Image pull secret for OCIR (harmless even though the repo is public).
kubectl create secret docker-registry oci-registry-secret -n "$NS" \
  --docker-server="${OCI_REGION}.ocir.io" \
  --docker-username="${OCI_NAMESPACE}/${OCI_USERNAME}" \
  --docker-password="${OCI_AUTH_TOKEN}" \
  --docker-email="ci@example.com" \
  --dry-run=client -o yaml | kubectl apply -n "$NS" -f -

echo "Bootstrap complete."
