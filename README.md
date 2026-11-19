# Secure Note-Taking Platform (Frontend)

Lightweight, functional HTML/JavaScript client integrated with the Secure Note-Taking REST API.

## Features
- JWT Registration & Login (`User` and `Admin` roles)
- Role-based Note management (Create, Read, Update, Delete with pagination)
- Admin User Management panel (Add, View, Update role, Delete users with pagination)
- Public Posts & live MongoDB Aggregation triggers:
  - Group users by interests (`GET /api/users/by-interests`)
  - Retrieve a user's posts via `$lookup` (`GET /api/posts/user/:userId`)