package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.id.EmployeeTeamId;
import com.springboot.MyTodoList.model.EmployeeTeam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeTeamRepository extends JpaRepository<EmployeeTeam, EmployeeTeamId> {
    List<EmployeeTeam> findById_TeamId(int teamId);
    List<EmployeeTeam> findById_EmployeeId(int employeeId);
    boolean existsById_EmployeeIdAndId_TeamId(int employeeId, int teamId);
}
