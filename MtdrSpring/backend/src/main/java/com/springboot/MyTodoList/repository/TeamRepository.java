package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, Integer> {
    List<Team> findByManager_EmployeeId(int managerId);
}