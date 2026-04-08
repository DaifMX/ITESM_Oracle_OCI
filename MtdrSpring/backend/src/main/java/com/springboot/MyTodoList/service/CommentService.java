package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Comment;
import com.springboot.MyTodoList.repository.CommentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CommentService {

    @Autowired
    private CommentRepository commentRepository;

    public List<Comment> findByTask(int taskId) {
        return commentRepository.findByTask_TaskIdOrderByCreatedAtAsc(taskId);
    }

    public List<Comment> findByEmployee(int employeeId) {
        return commentRepository.findByEmployee_EmployeeId(employeeId);
    }

    public Optional<Comment> findById(int id) {
        return commentRepository.findById(id);
    }

    public Comment save(Comment comment) {
        return commentRepository.save(comment);
    }

    public Optional<Comment> update(int id, String newContent) {
        return commentRepository.findById(id).map(existing -> {
            existing.setContent(newContent);
            return commentRepository.save(existing);
        });
    }

    public boolean delete(int id) {
        if (!commentRepository.existsById(id)) return false;
        commentRepository.deleteById(id);
        return true;
    }
}
