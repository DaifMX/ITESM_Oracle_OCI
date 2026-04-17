package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Employee;
import com.springboot.MyTodoList.model.Task;
import com.springboot.MyTodoList.repository.CommentRepository;
import com.springboot.MyTodoList.repository.EmployeeRepository;
import com.springboot.MyTodoList.repository.EmployeeTeamRepository;
import com.springboot.MyTodoList.repository.RefreshTokenRepository;
import com.springboot.MyTodoList.repository.TaskRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private EmployeeTeamRepository employeeTeamRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    public List<Employee> findAll() {
        return employeeRepository.findAll();
    }

    public ResponseEntity<Employee> getEmployeeById(int id) {
        Optional<Employee> found = employeeRepository.findById(id);
        if (found.isPresent()) {
            return new ResponseEntity<>(found.get(), HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    public Employee addEmployee(Employee employee) {
        return employeeRepository.save(employee);
    }

    @Transactional
    public boolean deleteEmployee(int id) {
        Optional<Employee> found = employeeRepository.findById(id);
        if (found.isEmpty()) return false;
        Employee employee = found.get();
        refreshTokenRepository.deleteByEmployee(employee);
        commentRepository.deleteAll(commentRepository.findByEmployee_EmployeeId(id));
        // Unassign this employee from any tasks they are assigned to
        List<Task> assignedTasks = taskRepository.findByAssignee_EmployeeId(id);
        for (Task task : assignedTasks) {
            task.setAssignee(null);
            taskRepository.save(task);
        }
        employeeTeamRepository.deleteAll(employeeTeamRepository.findById_EmployeeId(id));
        employeeRepository.deleteById(id);
        return true;
    }

    public Employee updateEmployee(int id, Employee updated) {
        Optional<Employee> existing = employeeRepository.findById(id);
        if (existing.isPresent()) {
            Employee employee = existing.get();
            employee.setFirstName(updated.getFirstName());
            employee.setLastName(updated.getLastName());
            employee.setEmail(updated.getEmail());
            employee.setModality(updated.getModality());
            employee.setPosition(updated.getPosition());
            employee.setRole(updated.getRole());
            employee.setPhoneNumber(updated.getPhoneNumber());
            employee.setTelegramChatId(updated.getTelegramChatId());
            return employeeRepository.save(employee);
        }
        return null;
    }
}
