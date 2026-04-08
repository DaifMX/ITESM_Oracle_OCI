package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.id.EmployeeTaskId;
import com.springboot.MyTodoList.model.Employee;
import com.springboot.MyTodoList.model.EmployeeTask;
import com.springboot.MyTodoList.model.Task;
import com.springboot.MyTodoList.repository.EmployeeRepository;
import com.springboot.MyTodoList.repository.EmployeeTaskRepository;
import com.springboot.MyTodoList.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class EmployeeTaskService {

    @Autowired
    private EmployeeTaskRepository employeeTaskRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private TaskRepository taskRepository;

    public List<EmployeeTask> findByTask(int taskId) {
        return employeeTaskRepository.findById_TaskId(taskId);
    }

    public List<EmployeeTask> findByEmployee(int employeeId) {
        return employeeTaskRepository.findById_EmployeeId(employeeId);
    }

    public Optional<EmployeeTask> assign(int taskId, int employeeId) {
        if (employeeTaskRepository.existsById_EmployeeIdAndId_TaskId(employeeId, taskId)) {
            return Optional.empty();
        }
        Optional<Employee> employee = employeeRepository.findById(employeeId);
        Optional<Task> task = taskRepository.findById(taskId);
        if (employee.isEmpty() || task.isEmpty()) return Optional.empty();

        EmployeeTask et = new EmployeeTask();
        et.setId(new EmployeeTaskId(employeeId, taskId));
        et.setEmployee(employee.get());
        et.setTask(task.get());
        return Optional.of(employeeTaskRepository.save(et));
    }

    public boolean unassign(int taskId, int employeeId) {
        EmployeeTaskId id = new EmployeeTaskId(employeeId, taskId);
        if (!employeeTaskRepository.existsById(id)) return false;
        employeeTaskRepository.deleteById(id);
        return true;
    }
}
