package com.springboot.MyTodoList.security;

import com.springboot.MyTodoList.model.User;
import com.springboot.MyTodoList.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String phonenumber) throws UsernameNotFoundException {
        User user = userRepository.findByPhonenumber(phonenumber)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + phonenumber));

        return new org.springframework.security.core.userdetails.User(
                user.getPhoneNumber(),
                user.getUserPassword(),
                Collections.emptyList()
        );
    }
}
