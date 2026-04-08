package com.springboot.MyTodoList.model;

import com.springboot.MyTodoList.id.EmployeeTaskId;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "EMPLOYEE_TASK")
public class EmployeeTask {

    @EmbeddedId
    private EmployeeTaskId id;

    @ManyToOne
    @MapsId("employeeId")
    @JoinColumn(name = "EMPLOYEE_ID")
    private Employee employee;

    @ManyToOne
    @MapsId("taskId")
    @JoinColumn(name = "TASK_ID")
    private Task task;

    @Column(name = "ASSIGNED_AT")
    private LocalDateTime assignedAt;

    @PrePersist
    protected void onCreate() {
        if (assignedAt == null) assignedAt = LocalDateTime.now();
    }

    public EmployeeTask() {}

    public EmployeeTaskId getId() { return id; }
    public void setId(EmployeeTaskId id) { this.id = id; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public Task getTask() { return task; }
    public void setTask(Task task) { this.task = task; }

    public LocalDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(LocalDateTime assignedAt) { this.assignedAt = assignedAt; }
}
