package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Integer> {
    List<Task> findByProject_ProjectId(int projectId);
    List<Task> findBySprint_SprintId(int sprintId);
    List<Task> findByStatus(String status);
    List<Task> findByProject_ProjectIdAndStatus(int projectId, String status);
    List<Task> findBySprint_SprintIdAndStatus(int sprintId, String status);
    List<Task> findByAssignee_EmployeeId(int employeeId);
}
