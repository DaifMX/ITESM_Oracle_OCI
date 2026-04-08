package com.springboot.MyTodoList.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class EmployeeTaskId implements Serializable {

    @Column(name = "EMPLOYEE_ID")
    private int employeeId;

    @Column(name = "TASK_ID")
    private int taskId;

    public EmployeeTaskId() {}

    public EmployeeTaskId(int employeeId, int taskId) {
        this.employeeId = employeeId;
        this.taskId = taskId;
    }

    public int getEmployeeId() { return employeeId; }
    public void setEmployeeId(int employeeId) { this.employeeId = employeeId; }

    public int getTaskId() { return taskId; }
    public void setTaskId(int taskId) { this.taskId = taskId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof EmployeeTaskId)) return false;
        EmployeeTaskId that = (EmployeeTaskId) o;
        return employeeId == that.employeeId && taskId == that.taskId;
    }

    @Override
    public int hashCode() {
        return Objects.hash(employeeId, taskId);
    }
}
