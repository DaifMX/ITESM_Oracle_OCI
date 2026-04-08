package com.springboot.MyTodoList.model;

import com.springboot.MyTodoList.id.EmployeeTeamId;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "EMPLOYEE_TEAM")
public class EmployeeTeam {

    @EmbeddedId
    private EmployeeTeamId id;

    @ManyToOne
    @MapsId("employeeId")
    @JoinColumn(name = "EMPLOYEE_ID")
    private Employee employee;

    @ManyToOne
    @MapsId("teamId")
    @JoinColumn(name = "TEAM_ID")
    private Team team;

    @Column(name = "JOINED_AT")
    private LocalDate joinedAt;

    public EmployeeTeam() {}

    public EmployeeTeamId getId() { return id; }
    public void setId(EmployeeTeamId id) { this.id = id; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public Team getTeam() { return team; }
    public void setTeam(Team team) { this.team = team; }

    public LocalDate getJoinedAt() { return joinedAt; }
    public void setJoinedAt(LocalDate joinedAt) { this.joinedAt = joinedAt; }
}
