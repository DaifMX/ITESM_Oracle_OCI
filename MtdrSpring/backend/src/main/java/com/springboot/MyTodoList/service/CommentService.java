package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Comment;
import com.springboot.MyTodoList.rag.RagDirtyEnqueuer;
import com.springboot.MyTodoList.repository.CommentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CommentService {

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private RagDirtyEnqueuer ragDirty;

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
        Comment saved = commentRepository.save(comment);
        if (saved.getTask() != null) {
            ragDirty.upsert(RagDirtyEnqueuer.TYPE_TASK, saved.getTask().getTaskId());
        }
        return saved;
    }

    public Optional<Comment> update(int id, String newContent) {
        return commentRepository.findById(id).map(existing -> {
            existing.setContent(newContent);
            Comment saved = commentRepository.save(existing);
            if (saved.getTask() != null) {
                ragDirty.upsert(RagDirtyEnqueuer.TYPE_TASK, saved.getTask().getTaskId());
            }
            return saved;
        });
    }

    public boolean delete(int id) {
        Optional<Comment> existing = commentRepository.findById(id);
        if (existing.isEmpty()) return false;
        Integer taskId = existing.get().getTask() != null
            ? existing.get().getTask().getTaskId() : null;
        commentRepository.deleteById(id);
        if (taskId != null) {
            ragDirty.upsert(RagDirtyEnqueuer.TYPE_TASK, taskId);
        }
        return true;
    }
}
