terraform {
  required_providers {
    oci = {
      # hashicorp/oci is frozen at 4.42.0 (2021) and moved to oracle/oci.
      # The old build is incompatible with current OCI (k8s image versions,
      # the rebranded Always Free "Autonomous AI Database", etc.).
      source  = "oracle/oci"
      version = ">= 6.0.0"
    }
  }
}
provider "oci" {
  region = var.ociRegionIdentifier
}