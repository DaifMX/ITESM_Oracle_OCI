package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Integer> {
    List<Task> findByProject_ProjectId(int projectId);
    List<Task> findBySprint_SprintId(int sprintId);
    List<Task> findByStatus(String status);
    List<Task> findByProject_ProjectIdAndStatus(int projectId, String status);
    List<Task> findBySprint_SprintIdAndStatus(int sprintId, String status);
    List<Task> findByProject_ProjectIdAndSprint_SprintId(int projectId, int sprintId);
    List<Task> findByAssignee_EmployeeId(int employeeId);
    Optional<Task> findByProject_ProjectIdAndTicketNumber(int projectId, int ticketNumber);
    List<Task> findByTicketNumberIsNullOrderByProject_ProjectIdAscTaskIdAsc();

    @Query("select coalesce(max(t.ticketNumber), 0) from Task t where t.project.projectId = :projectId")
    int findMaxTicketNumber(@Param("projectId") int projectId);
}
