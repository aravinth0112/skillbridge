"""
SkillBridge Database Seeder
Seeds realistic university sample data: departments, courses, skills, students, student skills, projects, project requirements, and shortlists.
Safe to run multiple times without crashing or creating duplicate records.
Run with: py -3.11 seed.py
"""

from datetime import date
from app.database import engine, SessionLocal, Base
from app.models.department import Department
from app.models.course import Course
from app.models.student import Student
from app.models.skill import Skill
from app.models.student_skill import StudentSkill
from app.models.project import Project
from app.models.project_skill import ProjectSkill
from app.models.shortlist import Shortlist

def get_or_create_dept(db, name, code):
    dept = db.query(Department).filter(Department.code == code).first()
    if not dept:
        dept = Department(name=name, code=code)
        db.add(dept)
        db.commit()
        db.refresh(dept)
    return dept

def get_or_create_course(db, name, code, dept_id):
    course = db.query(Course).filter(Course.code == code).first()
    if not course:
        course = Course(name=name, code=code, department_id=dept_id)
        db.add(course)
        db.commit()
        db.refresh(course)
    return course

def get_or_create_skill(db, name, category):
    skill = db.query(Skill).filter(Skill.name == name).first()
    if not skill:
        skill = Skill(name=name, category=category)
        db.add(skill)
        db.commit()
        db.refresh(skill)
    return skill

def get_or_create_student(db, full_name, email, reg_no, course_id, year, available=True, bio=None):
    student = db.query(Student).filter((Student.email == email) | (Student.reg_no == reg_no)).first()
    if not student:
        student = Student(
            full_name=full_name,
            email=email,
            reg_no=reg_no,
            course_id=course_id,
            year_of_study=year,
            available=available,
            bio=bio
        )
        db.add(student)
        db.commit()
        db.refresh(student)
    return student

def map_student_skill(db, student_id, skill_id, proficiency, verified=False):
    ss = db.query(StudentSkill).filter(
        StudentSkill.student_id == student_id,
        StudentSkill.skill_id == skill_id
    ).first()
    if not ss:
        ss = StudentSkill(
            student_id=student_id,
            skill_id=skill_id,
            proficiency=proficiency,
            verified=verified
        )
        db.add(ss)
        db.commit()

def get_or_create_project(db, title, description, status="open", deadline=None, contact_email="faculty@campus.edu"):
    proj = db.query(Project).filter(Project.title == title).first()
    if not proj:
        proj = Project(
            title=title,
            description=description,
            status=status,
            deadline=deadline,
            contact_email=contact_email
        )
        db.add(proj)
        db.commit()
        db.refresh(proj)
    return proj

def add_project_skill(db, project_id, skill_id, min_prof, weight):
    ps = db.query(ProjectSkill).filter(
        ProjectSkill.project_id == project_id,
        ProjectSkill.skill_id == skill_id
    ).first()
    if not ps:
        ps = ProjectSkill(
            project_id=project_id,
            skill_id=skill_id,
            min_proficiency=min_prof,
            weight=weight
        )
        db.add(ps)
        db.commit()

def add_shortlist_entry(db, project_id, student_id, score, status="shortlisted", notes=None):
    sl = db.query(Shortlist).filter(
        Shortlist.project_id == project_id,
        Shortlist.student_id == student_id
    ).first()
    if not sl:
        sl = Shortlist(
            project_id=project_id,
            student_id=student_id,
            match_score=score,
            status=status,
            notes=notes
        )
        db.add(sl)
        db.commit()

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("[SEED] Seeding SkillBridge dataset...")

        # 1. Departments
        cse = get_or_create_dept(db, "Computer Science & Engineering", "CSE")
        ece = get_or_create_dept(db, "Electronics & Communication Engineering", "ECE")
        mech = get_or_create_dept(db, "Mechanical Engineering", "MECH")
        it = get_or_create_dept(db, "Information Technology", "IT")

        # 2. Degree Programs
        btech_cse = get_or_create_course(db, "B.Tech Computer Science", "BT-CSE", cse.id)
        mtech_ai = get_or_create_course(db, "M.Tech Artificial Intelligence", "MT-AI", cse.id)
        btech_ece = get_or_create_course(db, "B.Tech Electronics & Comm", "BT-ECE", ece.id)
        btech_mech = get_or_create_course(db, "B.Tech Mechanical Engineering", "BT-MECH", mech.id)
        btech_it = get_or_create_course(db, "B.Tech Information Technology", "BT-IT", it.id)

        # 3. Comprehensive Skills Catalog
        skills_data = [
            ("Python", "Programming"),
            ("FastAPI", "Backend"),
            ("React", "Frontend"),
            ("PyTorch", "Machine Learning"),
            ("Docker", "DevOps"),
            ("Embedded C", "Embedded Systems"),
            ("ROS", "Robotics"),
            ("PostgreSQL", "Database"),
            ("TypeScript", "Frontend"),
            ("Flutter", "Mobile"),
            ("TensorFlow", "Machine Learning"),
            ("Kubernetes", "DevOps"),
            ("AWS", "Cloud"),
            ("SQL", "Database"),
            ("Go", "Backend"),
            ("Java", "Programming"),
            ("Linux", "System"),
            ("Next.js", "Frontend"),
            ("Redis", "Database"),
            ("MATLAB", "Engineering"),
            ("OpenCV", "Computer Vision"),
            ("C++", "Programming"),
        ]

        skill_objs = {}
        for name, cat in skills_data:
            skill_objs[name] = get_or_create_skill(db, name, cat)

        # 4. Realistic 35+ Student Profiles Across Cohorts
        students_raw = [
            # CSE Students
            ("Aarav Sharma", "aarav.s@campus.edu", "2022CSE001", btech_cse.id, 3, True, "Full-stack Python & React builder. Enjoys microservices and REST APIs."),
            ("Priya Patel", "priya.p@campus.edu", "2021AI002", mtech_ai.id, 2, True, "Deep learning and natural language processing researcher."),
            ("Kavya Nair", "kavya.n@campus.edu", "2023CSE015", btech_cse.id, 2, True, "Frontend enthusiast specializing in React, Next.js, and TypeScript."),
            ("Vikram Malhotra", "vikram.m@campus.edu", "2022CSE044", btech_cse.id, 3, True, "Backend software architect with Go, FastAPI, and Docker."),
            ("Ananya Deshmukh", "ananya.d@campus.edu", "2024CSE010", btech_cse.id, 1, True, "First year open-source contributor learning Python and Linux."),
            ("Devansh Gupta", "devansh.g@campus.edu", "2021CSE088", btech_cse.id, 4, False, "Senior student working on distributed systems with Kubernetes and AWS."),
            ("Ishita Sen", "ishita.s@campus.edu", "2022CSE052", btech_cse.id, 3, True, "Data engineer experienced in PostgreSQL, Redis, and PySpark."),
            ("Tanmay Joshi", "tanmay.j@campus.edu", "2023CSE067", btech_cse.id, 2, True, "Mobile app developer with Flutter and Firebase background."),

            # M.Tech AI Students
            ("Rahul Bose", "rahul.b@campus.edu", "2022AI005", mtech_ai.id, 2, True, "Computer vision specialist focusing on PyTorch, OpenCV, and YOLO."),
            ("Meera Iyer", "meera.i@campus.edu", "2023AI012", mtech_ai.id, 1, True, "Reinforcement learning researcher and Python data science practitioner."),
            ("Abhinav Reddy", "abhinav.r@campus.edu", "2023AI019", mtech_ai.id, 1, False, "LLM prompt engineer and transformer fine-tuning researcher."),
            ("Swati Mukherjee", "swati.m@campus.edu", "2022AI023", mtech_ai.id, 2, True, "Statistical machine learning and TensorFlow model optimization."),

            # ECE Students
            ("Rohan Verma", "rohan.v@campus.edu", "2023ECE003", btech_ece.id, 2, True, "Embedded systems engineer with C, STM32, and RTOS experience."),
            ("Neha Kulkarni", "neha.k@campus.edu", "2022ECE027", btech_ece.id, 3, True, "IoT sensor networking and microcontrollers with Embedded C and Python."),
            ("Aditya Mishra", "aditya.m@campus.edu", "2021ECE041", btech_ece.id, 4, False, "Senior FPGA designer, Verilog, and signal processing engineer."),
            ("Pooja Hegde", "pooja.h@campus.edu", "2023ECE055", btech_ece.id, 2, True, "Wireless sensor networks, BLE protocols, and embedded Linux."),
            ("Gaurav Singhania", "gaurav.s@campus.edu", "2024ECE008", btech_ece.id, 1, True, "Freshman exploring Arduino, basic circuit design, and C programming."),
            ("Ritu Agarwal", "ritu.a@campus.edu", "2022ECE062", btech_ece.id, 3, True, "Robotics teleoperation with ROS, microcontrollers, and OpenCV."),

            # Mechanical Engineering Students
            ("Sneha Rao", "sneha.r@campus.edu", "2022ME004", btech_mech.id, 3, True, "Robotics kinematics and autonomous navigation with ROS and C++."),
            ("Karan Kapoor", "karan.k@campus.edu", "2021ME018", btech_mech.id, 4, False, "CAD/CAM mechanical designer and finite element analyst."),
            ("Arjun Nambiar", "arjun.n@campus.edu", "2023ME033", btech_mech.id, 2, True, "Mechatronics enthusiast integrating motors with microcontrollers and ROS."),
            ("Bhavna Yadav", "bhavna.y@campus.edu", "2022ME049", btech_mech.id, 3, True, "Additive manufacturing and drone flight controller tuning."),
            ("Nikhil Bansal", "nikhil.b@campus.edu", "2024ME002", btech_mech.id, 1, True, "First year mechanical student learning MATLAB and 3D printing."),
            ("Divya Soni", "divya.s@campus.edu", "2023ME071", btech_mech.id, 2, True, "Thermal analysis, sensor telemetry, and basic Embedded C."),

            # IT Students
            ("Varun Pillai", "varun.p@campus.edu", "2022IT009", btech_it.id, 3, True, "Cloud DevOps engineer certified in AWS, Docker, and Linux."),
            ("Simran Kaur", "simran.k@campus.edu", "2023IT021", btech_it.id, 2, True, "Web application developer using FastAPI, React, and PostgreSQL."),
            ("Manish Tiwari", "manish.t@campus.edu", "2021IT038", btech_it.id, 4, False, "Cybersecurity and network infrastructure specialist."),
            ("Aishwarya Jain", "aishwarya.j@campus.edu", "2024IT014", btech_it.id, 1, True, "Aspiring software developer learning Java, Python, and SQL."),
            ("Harsh Vardhan", "harsh.v@campus.edu", "2022IT056", btech_it.id, 3, True, "Full-stack developer working with TypeScript, React, and Go."),
            ("Rhea Chopra", "rhea.c@campus.edu", "2023IT074", btech_it.id, 2, True, "Database administrator with deep knowledge of PostgreSQL and Redis."),
            ("Siddharth Lal", "siddharth.l@campus.edu", "2022IT082", btech_it.id, 3, True, "Mobile and web developer skilled in Flutter and cloud backends."),
            ("Zoya Akhtar", "zoya.a@campus.edu", "2021IT091", btech_it.id, 4, True, "Full-stack developer with React, Python, Docker, and Kubernetes."),
            ("Pranav Nair", "pranav.n@campus.edu", "2023IT105", btech_it.id, 2, True, "Python automation scriptwriter and Linux systems administrator."),
            ("Alia Bhattacharya", "alia.b@campus.edu", "2024IT028", btech_it.id, 1, True, "First year learner focusing on programming fundamentals and git."),
        ]

        stu_objs = {}
        for name, email, reg, cid, yr, avail, bio in students_raw:
            stu_objs[name] = get_or_create_student(db, name, email, reg, cid, yr, avail, bio)

        # 5. Assign Realistic Skill Profiles with Varied Proficiencies & Verifications
        skill_assignments = [
            ("Aarav Sharma", [("Python", 4, True), ("FastAPI", 4, True), ("React", 3, False), ("Docker", 2, False), ("SQL", 4, True)]),
            ("Priya Patel", [("Python", 5, True), ("PyTorch", 4, True), ("TensorFlow", 4, True), ("Docker", 3, True), ("OpenCV", 3, False)]),
            ("Kavya Nair", [("React", 4, True), ("TypeScript", 4, True), ("Next.js", 3, False), ("Python", 2, False)]),
            ("Vikram Malhotra", [("Go", 4, True), ("FastAPI", 4, True), ("Docker", 3, True), ("PostgreSQL", 4, True), ("Redis", 3, False)]),
            ("Ananya Deshmukh", [("Python", 2, False), ("Linux", 2, True)]),
            ("Devansh Gupta", [("Kubernetes", 4, True), ("AWS", 4, True), ("Docker", 4, True), ("Linux", 4, True), ("Go", 3, False)]),
            ("Ishita Sen", [("PostgreSQL", 4, True), ("SQL", 4, True), ("Redis", 3, False), ("Python", 3, True)]),
            ("Tanmay Joshi", [("Flutter", 4, True), ("React", 2, False), ("Python", 3, False)]),

            ("Rahul Bose", [("PyTorch", 4, True), ("OpenCV", 4, True), ("Python", 5, True), ("C++", 3, False)]),
            ("Meera Iyer", [("Python", 4, True), ("TensorFlow", 3, False), ("PyTorch", 3, True), ("SQL", 3, False)]),
            ("Abhinav Reddy", [("Python", 4, True), ("PyTorch", 3, True), ("Linux", 3, False)]),
            ("Swati Mukherjee", [("Python", 4, True), ("TensorFlow", 4, True), ("MATLAB", 3, False)]),

            ("Rohan Verma", [("Embedded C", 4, True), ("C++", 3, True), ("Linux", 3, False), ("Python", 2, False)]),
            ("Neha Kulkarni", [("Embedded C", 4, True), ("Python", 3, True), ("SQL", 2, False)]),
            ("Aditya Mishra", [("Embedded C", 4, True), ("C++", 4, True), ("MATLAB", 4, True)]),
            ("Pooja Hegde", [("Embedded C", 3, True), ("Linux", 3, False)]),
            ("Gaurav Singhania", [("Embedded C", 1, False), ("C++", 1, False)]),
            ("Ritu Agarwal", [("ROS", 3, True), ("Embedded C", 3, True), ("OpenCV", 2, False)]),

            ("Sneha Rao", [("ROS", 4, True), ("C++", 4, True), ("Embedded C", 3, False), ("Python", 3, False)]),
            ("Karan Kapoor", [("MATLAB", 4, True), ("C++", 2, False)]),
            ("Arjun Nambiar", [("ROS", 3, True), ("Embedded C", 3, False), ("C++", 3, False)]),
            ("Bhavna Yadav", [("MATLAB", 3, True), ("Python", 2, False)]),
            ("Nikhil Bansal", [("MATLAB", 2, False)]),
            ("Divya Soni", [("Embedded C", 2, False), ("MATLAB", 2, False)]),

            ("Varun Pillai", [("AWS", 4, True), ("Docker", 4, True), ("Kubernetes", 3, True), ("Linux", 4, True)]),
            ("Simran Kaur", [("FastAPI", 4, True), ("React", 3, True), ("PostgreSQL", 3, False), ("Python", 4, True)]),
            ("Manish Tiwari", [("Linux", 4, True), ("Python", 3, True), ("SQL", 3, False)]),
            ("Aishwarya Jain", [("Java", 3, False), ("Python", 2, False), ("SQL", 2, False)]),
            ("Harsh Vardhan", [("React", 4, True), ("TypeScript", 3, True), ("Go", 3, False), ("PostgreSQL", 3, False)]),
            ("Rhea Chopra", [("PostgreSQL", 4, True), ("Redis", 4, True), ("SQL", 4, True)]),
            ("Siddharth Lal", [("Flutter", 4, True), ("FastAPI", 3, False), ("Python", 3, False)]),
            ("Zoya Akhtar", [("React", 4, True), ("Python", 4, True), ("Docker", 3, True), ("Kubernetes", 3, False)]),
            ("Pranav Nair", [("Python", 4, True), ("Linux", 4, True), ("SQL", 3, False)]),
            ("Alia Bhattacharya", [("Python", 2, False)]),
        ]

        for s_name, skills in skill_assignments:
            if s_name in stu_objs:
                st = stu_objs[s_name]
                for sk_name, prof, ver in skills:
                    if sk_name in skill_objs:
                        map_student_skill(db, st.id, skill_objs[sk_name].id, prof, ver)

        # 6. Projects with Varied Requirements & Deadlines
        p1 = get_or_create_project(
            db,
            title="Campus AI Assistant",
            description="LLM-powered query assistant for student academic rules, courses, and timetables.",
            status="open",
            deadline=date(2026, 12, 15),
            contact_email="faculty.cse@campus.edu"
        )
        add_project_skill(db, p1.id, skill_objs["Python"].id, min_prof=3, weight=5)
        add_project_skill(db, p1.id, skill_objs["FastAPI"].id, min_prof=3, weight=4)
        add_project_skill(db, p1.id, skill_objs["PyTorch"].id, min_prof=2, weight=3)

        p2 = get_or_create_project(
            db,
            title="Autonomous Warehouse Rover",
            description="Obstacle avoidance rover using ROS, embedded sensors, and camera vision.",
            status="open",
            deadline=date(2027, 3, 30),
            contact_email="faculty.mech@campus.edu"
        )
        add_project_skill(db, p2.id, skill_objs["ROS"].id, min_prof=3, weight=5)
        add_project_skill(db, p2.id, skill_objs["Embedded C"].id, min_prof=3, weight=4)
        add_project_skill(db, p2.id, skill_objs["C++"].id, min_prof=2, weight=3)

        p3 = get_or_create_project(
            db,
            title="Cloud-Native Telemetry Gateway",
            description="Real-time IoT metrics ingestion pipeline deployed onto Kubernetes with Redis buffering.",
            status="open",
            deadline=date(2027, 1, 20),
            contact_email="cloud.lab@campus.edu"
        )
        add_project_skill(db, p3.id, skill_objs["Docker"].id, min_prof=3, weight=4)
        add_project_skill(db, p3.id, skill_objs["AWS"].id, min_prof=3, weight=4)
        add_project_skill(db, p3.id, skill_objs["PostgreSQL"].id, min_prof=3, weight=3)
        add_project_skill(db, p3.id, skill_objs["Go"].id, min_prof=2, weight=2)

        p4 = get_or_create_project(
            db,
            title="Student Health & Wellness Portal",
            description="Cross-platform mobile and web application with appointment scheduling.",
            status="in_progress",
            deadline=date(2026, 11, 25),
            contact_email="health.admin@campus.edu"
        )
        add_project_skill(db, p4.id, skill_objs["React"].id, min_prof=3, weight=4)
        add_project_skill(db, p4.id, skill_objs["FastAPI"].id, min_prof=3, weight=4)
        add_project_skill(db, p4.id, skill_objs["Flutter"].id, min_prof=2, weight=3)

        # 7. Initial Realistic Shortlists
        add_shortlist_entry(db, p1.id, stu_objs["Aarav Sharma"].id, score=85.0, status="shortlisted", notes="Strong FastAPI & Python skills.")
        add_shortlist_entry(db, p1.id, stu_objs["Priya Patel"].id, score=77.5, status="contacted", notes="Strong machine learning background.")
        add_shortlist_entry(db, p2.id, stu_objs["Sneha Rao"].id, score=95.0, status="selected", notes="Excellent ROS experience and availability.")
        add_shortlist_entry(db, p3.id, stu_objs["Varun Pillai"].id, score=92.0, status="shortlisted", notes="Cloud certified with AWS and Docker.")

        print("Seeding completed successfully!")
        print(f"Total in Database: {db.query(Department).count()} departments, {db.query(Course).count()} courses, {db.query(Skill).count()} skills, {db.query(Student).count()} students, {db.query(Project).count()} projects, {db.query(Shortlist).count()} shortlists.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
