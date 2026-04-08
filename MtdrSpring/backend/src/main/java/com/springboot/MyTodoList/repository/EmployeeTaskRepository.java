package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.id.EmployeeTaskId;
import com.springboot.MyTodoList.model.EmployeeTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeTaskRepository extends JpaRepository<EmployeeTask, EmployeeTaskId> {
    List<EmployeeTask> findById_TaskId(int taskId);
    List<EmployeeTask> findById_EmployeeId(int employeeId);
    boolean existsById_EmployeeIdAndId_TaskId(int employeeId, int taskId);
}
