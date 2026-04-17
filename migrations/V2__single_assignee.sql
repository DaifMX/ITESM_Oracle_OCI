-- ============================================================
-- Migration V2: Single assignee per task (developer only)
--
-- Changes:
--   1. Add ASSIGNEE_ID column to PROJECT_TASK (FK -> EMPLOYEE)
--   2. Migrate existing data from EMPLOYEE_TASK (pick one developer per task)
--   3. Drop the EMPLOYEE_TASK join table (no longer needed)
-- ============================================================

-- 1. Add ASSIGNEE_ID column
ALTER TABLE PROJECT_TASK ADD (ASSIGNEE_ID NUMBER(10));

ALTER TABLE PROJECT_TASK
    ADD CONSTRAINT FK_TASK_ASSIGNEE
    FOREIGN KEY (ASSIGNEE_ID) REFERENCES EMPLOYEE(EMPLOYEE_ID)
    ON DELETE SET NULL;

-- 2. Migrate existing assignments: keep one developer per task
--    If a task had multiple assignees, pick the one with the lowest EMPLOYEE_ID
--    Only developers are valid assignees, so managers are excluded
MERGE INTO PROJECT_TASK pt
USING (
    SELECT et.TASK_ID, MIN(et.EMPLOYEE_ID) AS EMPLOYEE_ID
    FROM   EMPLOYEE_TASK et
    JOIN   EMPLOYEE e ON e.EMPLOYEE_ID = et.EMPLOYEE_ID
                     AND e.ROLE = 'developer'
    GROUP  BY et.TASK_ID
) src ON (pt.TASK_ID = src.TASK_ID)
WHEN MATCHED THEN UPDATE SET pt.ASSIGNEE_ID = src.EMPLOYEE_ID;

COMMIT;

-- 3. Drop the old many-to-many join table
DROP TABLE EMPLOYEE_TASK;
