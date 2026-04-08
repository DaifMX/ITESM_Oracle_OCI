package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Integer> {
    List<Comment> findByTask_TaskIdOrderByCreatedAtAsc(int taskId);
    List<Comment> findByEmployee_EmployeeId(int employeeId);
}
