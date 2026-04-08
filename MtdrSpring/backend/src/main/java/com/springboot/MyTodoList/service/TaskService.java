package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Task;
import com.springboot.MyTodoList.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TaskService {

    @Autowired
    private TaskRepository taskRepository;

    public List<Task> findAll() {
        return taskRepository.findAll();
    }

    public Optional<Task> findById(int id) {
        return taskRepository.findById(id);
    }

    public List<Task> findByProject(int projectId) {
        return taskRepository.findByProject_ProjectId(projectId);
    }

    public List<Task> findBySprint(int sprintId) {
        return taskRepository.findBySprint_SprintId(sprintId);
    }

    public List<Task> findByStatus(String status) {
        return taskRepository.findByStatus(status);
    }

    public List<Task> findByProjectAndStatus(int projectId, String status) {
        return taskRepository.findByProject_ProjectIdAndStatus(projectId, status);
    }

    public List<Task> findBySprintAndStatus(int sprintId, String status) {
        return taskRepository.findBySprint_SprintIdAndStatus(sprintId, status);
    }

    public Task save(Task task) {
        return taskRepository.save(task);
    }

    public Optional<Task> update(int id, Task updated) {
        return taskRepository.findById(id).map(existing -> {
            existing.setSprint(updated.getSprint());
            existing.setProject(updated.getProject());
            existing.setTitle(updated.getTitle());
            existing.setDescription(updated.getDescription());
            existing.setStatus(updated.getStatus());
            existing.setPriority(updated.getPriority());
            existing.setStoryPoints(updated.getStoryPoints());
            existing.setEstimatedHours(updated.getEstimatedHours());
            existing.setActualHours(updated.getActualHours());
            existing.setStartDate(updated.getStartDate());
            existing.setExpectedEndDate(updated.getExpectedEndDate());
            existing.setEndDate(updated.getEndDate());
            return taskRepository.save(existing);
        });
    }

    public boolean delete(int id) {
        if (!taskRepository.existsById(id)) return false;
        taskRepository.deleteById(id);
        return true;
    }
}
