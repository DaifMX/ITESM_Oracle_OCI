package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Project;
import com.springboot.MyTodoList.rag.RagDirtyEnqueuer;
import com.springboot.MyTodoList.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ProjectService {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private RagDirtyEnqueuer ragDirty;

    public List<Project> findAll() {
        return projectRepository.findAll();
    }

    public Optional<Project> findById(int id) {
        return projectRepository.findById(id);
    }

    public List<Project> findByTeam(int teamId) {
        return projectRepository.findByTeam_TeamId(teamId);
    }

    public List<Project> findByStatus(String status) {
        return projectRepository.findByStatus(status);
    }

    public Project save(Project project) {
        Project saved = projectRepository.save(project);
        ragDirty.upsert(RagDirtyEnqueuer.TYPE_PROJECT, saved.getProjectId());
        return saved;
    }

    public Optional<Project> update(int id, Project updated) {
        return projectRepository.findById(id).map(existing -> {
            existing.setTeam(updated.getTeam());
            existing.setName(updated.getName());
            existing.setDescription(updated.getDescription());
            existing.setStatus(updated.getStatus());
            existing.setStartDate(updated.getStartDate());
            existing.setEndDate(updated.getEndDate());
            Project saved = projectRepository.save(existing);
            ragDirty.upsert(RagDirtyEnqueuer.TYPE_PROJECT, saved.getProjectId());
            return saved;
        });
    }

    public boolean delete(int id) {
        if (!projectRepository.existsById(id)) return false;
        projectRepository.deleteById(id);
        ragDirty.delete(RagDirtyEnqueuer.TYPE_PROJECT, id);
        return true;
    }
}
