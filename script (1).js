// Global variables
let teachers = [];
let timetables = {};
let currentSection = 'A';
let userAccounts = [
    { username: 'Aryan', password: '1234' } // Default account
];
let numberOfClasses = 3; // Default to 3 classes

// DOM Elements
const loginPage = document.getElementById('loginPage');
const createAccountPage = document.getElementById('createAccountPage');
const mainPage = document.getElementById('mainPage');
const loginForm = document.getElementById('loginForm');
const createAccountForm = document.getElementById('createAccountForm');
const loginError = document.getElementById('loginError');
const createAccountError = document.getElementById('createAccountError');
const createAccountSuccess = document.getElementById('createAccountSuccess');
const showCreateAccountLink = document.getElementById('showCreateAccount');
const showLoginLink = document.getElementById('showLogin');
const logoutBtn = document.getElementById('logoutBtn');
const teacherForm = document.getElementById('teacherForm');
const teachersList = document.getElementById('teachersList');
const generateBtn = document.getElementById('generateBtn');
const generationStatus = document.getElementById('generationStatus');
const timetablesContainer = document.getElementById('timetablesContainer');
const timetableDisplay = document.getElementById('timetableDisplay');
const sectionTabs = document.getElementById('sectionTabs');
const numberOfClassesSelect = document.getElementById('numberOfClasses');

// Load accounts from localStorage
function loadAccounts() {
    const saved = localStorage.getItem('timetableAccounts');
    if (saved) {
        userAccounts = JSON.parse(saved);
        // Ensure default account exists
        if (!userAccounts.find(acc => acc.username === 'Aryan')) {
            userAccounts.unshift({ username: 'Aryan', password: '1234' });
        }
    }
}

// Save accounts to localStorage
function saveAccounts() {
    localStorage.setItem('timetableAccounts', JSON.stringify(userAccounts));
}

// Initialize
loadAccounts();

// Show create account page
showCreateAccountLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginPage.classList.remove('active');
    createAccountPage.classList.add('active');
    createAccountForm.reset();
    createAccountError.textContent = '';
    createAccountSuccess.textContent = '';
});

// Show login page
showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    createAccountPage.classList.remove('active');
    loginPage.classList.add('active');
    loginForm.reset();
    loginError.textContent = '';
});

// Create account functionality
createAccountForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Clear previous messages
    createAccountError.textContent = '';
    createAccountSuccess.textContent = '';

    // Validation
    if (username.length < 3) {
        createAccountError.textContent = 'Username must be at least 3 characters long';
        return;
    }

    if (password.length < 4) {
        createAccountError.textContent = 'Password must be at least 4 characters long';
        return;
    }

    if (password !== confirmPassword) {
        createAccountError.textContent = 'Passwords do not match';
        return;
    }

    // Check if username already exists
    if (userAccounts.find(acc => acc.username === username)) {
        createAccountError.textContent = 'Username already exists';
        return;
    }

    // Create account
    userAccounts.push({ username, password });
    saveAccounts();

    createAccountSuccess.textContent = 'Account created successfully! Redirecting to login...';
    
    setTimeout(() => {
        createAccountPage.classList.remove('active');
        loginPage.classList.add('active');
        createAccountForm.reset();
        createAccountSuccess.textContent = '';
    }, 2000);
});

// Login functionality
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    const account = userAccounts.find(acc => acc.username === username && acc.password === password);

    if (account) {
        loginPage.classList.remove('active');
        mainPage.classList.add('active');
        loginError.textContent = '';
    } else {
        loginError.textContent = 'Invalid username or password';
    }
});

// Logout functionality
logoutBtn.addEventListener('click', () => {
    mainPage.classList.remove('active');
    loginPage.classList.add('active');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    loginError.textContent = '';
    // Reset teachers and timetables
    teachers = [];
    timetables = {};
    updateTeachersList();
    timetablesContainer.classList.add('hidden');
});

// Number of classes change handler
numberOfClassesSelect.addEventListener('change', () => {
    numberOfClasses = parseInt(numberOfClassesSelect.value);
});

// Add teacher functionality
teacherForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const teacherName = document.getElementById('teacherName').value.trim();
    const subjectName = document.getElementById('subjectName').value.trim();
    const periodsPerWeek = parseInt(document.getElementById('periodsPerWeek').value);

    if (teacherName && subjectName && periodsPerWeek > 0) {
        teachers.push({
            id: Date.now(),
            name: teacherName,
            subject: subjectName,
            periodsPerWeek: periodsPerWeek
        });

        updateTeachersList();
        teacherForm.reset();
    }
});

// Update teachers list display
function updateTeachersList() {
    if (teachers.length === 0) {
        teachersList.innerHTML = '<p style="color: #999; text-align: center;">No teachers added yet</p>';
        return;
    }

    teachersList.innerHTML = teachers.map(teacher => `
        <div class="teacher-item">
            <div class="teacher-info">
                <strong>${teacher.name}</strong>
                <span>Subject: ${teacher.subject}</span>
                <span>Periods/Week: ${teacher.periodsPerWeek}</span>
            </div>
            <button class="btn btn-danger" onclick="removeTeacher(${teacher.id})">Remove</button>
        </div>
    `).join('');
}

// Remove teacher
function removeTeacher(id) {
    teachers = teachers.filter(t => t.id !== id);
    updateTeachersList();
}

// Generate timetable
generateBtn.addEventListener('click', async () => {
    if (teachers.length === 0) {
        showStatus('Please add at least one teacher before generating timetable', 'error');
        return;
    }

    const periodsPerDay = parseInt(document.getElementById('periodsPerDay').value);
    const daysPerWeek = parseInt(document.getElementById('daysPerWeek').value);
    numberOfClasses = parseInt(numberOfClassesSelect.value);

    showStatus('Generating timetables...', 'loading');

    try {
        const response = await fetch('http://localhost:5000/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teachers: teachers,
                periodsPerDay: periodsPerDay,
                daysPerWeek: daysPerWeek,
                numberOfClasses: numberOfClasses
            })
        });

        const data = await response.json();

        if (data.success) {
            timetables = data.timetables;
            showStatus('Timetables generated successfully!', 'success');
            createSectionTabs();
            displayTimetable(Object.keys(timetables)[0]); // Display first section
            timetablesContainer.classList.remove('hidden');
        } else {
            showStatus(data.message || 'Failed to generate timetable', 'error');
        }
    } catch (error) {
        showStatus('Error: Make sure the Python backend is running on port 5000', 'error');
        console.error('Error:', error);
    }
});

// Show status message
function showStatus(message, type) {
    generationStatus.textContent = message;
    generationStatus.className = `status-message ${type}`;
}

// Create section tabs dynamically
function createSectionTabs() {
    const sectionNames = ['A', 'B', 'C', 'D'];
    sectionTabs.innerHTML = '';
    
    Object.keys(timetables).forEach((section, index) => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${index === 0 ? 'active' : ''}`;
        btn.dataset.section = section;
        btn.textContent = `Section ${section}`;
        
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            displayTimetable(section);
        });
        
        sectionTabs.appendChild(btn);
    });
}

// Section tab switching (kept for reference, now handled in createSectionTabs)
// This is now redundant but keeping structure for compatibility
/*
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const section = btn.dataset.section;
        displayTimetable(section);
    });
});
*/

// Display timetable
function displayTimetable(section) {
    currentSection = section;
    const timetable = timetables[section];

    if (!timetable) {
        timetableDisplay.innerHTML = '<p>No timetable available for this section</p>';
        return;
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const daysPerWeek = parseInt(document.getElementById('daysPerWeek').value);
    const periodsPerDay = parseInt(document.getElementById('periodsPerDay').value);

    let html = `
        <div class="timetable">
            <table>
                <thead>
                    <tr>
                        <th>Day/Period</th>
                        ${Array.from({length: periodsPerDay}, (_, i) => `<th>Period ${i + 1}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;

    for (let day = 0; day < daysPerWeek; day++) {
        html += `<tr><td><strong>${days[day]}</strong></td>`;
        
        for (let period = 0; period < periodsPerDay; period++) {
            const slot = timetable[day][period];
            if (slot) {
                html += `
                    <td class="period-cell">
                        <span class="subject">${slot.subject}</span>
                        <span class="teacher">${slot.teacher}</span>
                    </td>
                `;
            } else {
                html += `<td class="period-cell">-</td>`;
            }
        }
        
        html += `</tr>`;
    }

    html += `
                </tbody>
            </table>
        </div>
    `;

    timetableDisplay.innerHTML = html;
}

// Initialize
updateTeachersList();
