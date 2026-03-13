package com.springboot.MyTodoList.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class EmployeeTeamId implements Serializable {

    @Column(name = "EMPLOYEE_ID")
    private int employeeId;

    @Column(name = "TEAM_ID")
    private int teamId;

    public EmployeeTeamId() {}

    public EmployeeTeamId(int employeeId, int teamId) {
        this.employeeId = employeeId;
        this.teamId = teamId;
    }

    public int getEmployeeId() { return employeeId; }
    public void setEmployeeId(int employeeId) { this.employeeId = employeeId; }

    public int getTeamId() { return teamId; }
    public void setTeamId(int teamId) { this.teamId = teamId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof EmployeeTeamId)) return false;
        EmployeeTeamId that = (EmployeeTeamId) o;
        return employeeId == that.employeeId && teamId == that.teamId;
    }

    @Override
    public int hashCode() {
        return Objects.hash(employeeId, teamId);
    }
}
