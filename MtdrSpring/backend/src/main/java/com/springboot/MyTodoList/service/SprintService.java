package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.rag.RagDirtyEnqueuer;
import com.springboot.MyTodoList.repository.SprintRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SprintService {

    @Autowired
    private SprintRepository sprintRepository;

    @Autowired
    private RagDirtyEnqueuer ragDirty;

    public List<Sprint> findAll() {
        return sprintRepository.findAll();
    }

    public Optional<Sprint> findById(int id) {
        return sprintRepository.findById(id);
    }

    public List<Sprint> findByProject(int projectId) {
        return sprintRepository.findByProject_ProjectId(projectId);
    }

    public Optional<Sprint> findActiveByProject(int projectId) {
        return sprintRepository.findByProject_ProjectIdAndStatus(projectId, "active");
    }

    public List<Sprint> findByStatus(String status) {
        return sprintRepository.findByStatus(status);
    }

    public Sprint save(Sprint sprint) {
        Sprint saved = sprintRepository.save(sprint);
        ragDirty.upsert(RagDirtyEnqueuer.TYPE_SPRINT, saved.getSprintId());
        return saved;
    }

    public Optional<Sprint> update(int id, Sprint updated) {
        return sprintRepository.findById(id).map(existing -> {
            existing.setProject(updated.getProject());
            existing.setName(updated.getName());
            existing.setGoal(updated.getGoal());
            existing.setStartDate(updated.getStartDate());
            existing.setEndDate(updated.getEndDate());
            existing.setStatus(updated.getStatus());
            Sprint saved = sprintRepository.save(existing);
            ragDirty.upsert(RagDirtyEnqueuer.TYPE_SPRINT, saved.getSprintId());
            return saved;
        });
    }

    public boolean delete(int id) {
        if (!sprintRepository.existsById(id)) return false;
        sprintRepository.deleteById(id);
        ragDirty.delete(RagDirtyEnqueuer.TYPE_SPRINT, id);
        return true;
    }
}
