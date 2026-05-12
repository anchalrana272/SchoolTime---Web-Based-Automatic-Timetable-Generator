from flask import Flask, request, jsonify
from flask_cors import CORS
import random
from typing import List, Dict, Tuple

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

class TimetableGenerator:
    def __init__(self, teachers: List[Dict], periods_per_day: int, days_per_week: int, number_of_classes: int = 3):
        self.teachers = teachers
        self.periods_per_day = periods_per_day
        self.days_per_week = days_per_week
        self.number_of_classes = number_of_classes
        self.sections = ['A', 'B', 'C', 'D'][:number_of_classes]  # Dynamic sections based on input
        
    def generate_timetables(self) -> Dict:
        """Generate timetables for all sections"""
        timetables = {}
        
        # Initialize timetables for each section
        for section in self.sections:
            timetables[section] = [[None for _ in range(self.periods_per_day)] 
                                   for _ in range(self.days_per_week)]
        
        # Track teacher assignments to prevent conflicts
        teacher_schedule = {}  # {(day, period): {teacher_name: section}}
        
        # Create a list of all assignments needed
        assignments = []
        for teacher in self.teachers:
            for _ in range(teacher['periodsPerWeek']):
                for section in self.sections:
                    assignments.append({
                        'teacher': teacher['name'],
                        'subject': teacher['subject'],
                        'section': section
                    })
        
        # Shuffle assignments for randomness
        random.shuffle(assignments)
        
        # Try to assign each period
        for assignment in assignments:
            placed = False
            attempts = 0
            max_attempts = 100
            
            while not placed and attempts < max_attempts:
                day = random.randint(0, self.days_per_week - 1)
                period = random.randint(0, self.periods_per_day - 1)
                
                section = assignment['section']
                teacher = assignment['teacher']
                
                # Check if this slot is free for the section
                if timetables[section][day][period] is None:
                    # Check if teacher is not already assigned at this time
                    slot_key = (day, period)
                    
                    if slot_key not in teacher_schedule:
                        teacher_schedule[slot_key] = {}
                    
                    if teacher not in teacher_schedule[slot_key]:
                        # Assign the period
                        timetables[section][day][period] = {
                            'teacher': teacher,
                            'subject': assignment['subject']
                        }
                        teacher_schedule[slot_key][teacher] = section
                        placed = True
                
                attempts += 1
            
            if not placed:
                # If we couldn't place it after many attempts, try sequential placement
                placed = self._sequential_placement(
                    timetables, teacher_schedule, assignment
                )
        
        return timetables
    
    def _sequential_placement(self, timetables, teacher_schedule, assignment):
        """Try to place assignment sequentially if random placement fails"""
        section = assignment['section']
        teacher = assignment['teacher']
        
        for day in range(self.days_per_week):
            for period in range(self.periods_per_day):
                if timetables[section][day][period] is None:
                    slot_key = (day, period)
                    
                    if slot_key not in teacher_schedule:
                        teacher_schedule[slot_key] = {}
                    
                    if teacher not in teacher_schedule[slot_key]:
                        timetables[section][day][period] = {
                            'teacher': teacher,
                            'subject': assignment['subject']
                        }
                        teacher_schedule[slot_key][teacher] = section
                        return True
        
        return False
    
    def validate_timetable(self, timetables: Dict, teacher_schedule: Dict) -> bool:
        """Validate that there are no conflicts in the generated timetable"""
        # Check for teacher conflicts (teacher teaching multiple sections at same time)
        for slot_key, teachers in teacher_schedule.items():
            teacher_sections = {}
            for teacher, section in teachers.items():
                if teacher in teacher_sections:
                    return False  # Teacher conflict found
                teacher_sections[teacher] = section
        
        return True


@app.route('/generate', methods=['POST'])
def generate_timetable():
    """API endpoint to generate timetable"""
    try:
        data = request.json
        teachers = data.get('teachers', [])
        periods_per_day = data.get('periodsPerDay', 7)
        days_per_week = data.get('daysPerWeek', 6)
        number_of_classes = data.get('numberOfClasses', 3)
        
        if not teachers:
            return jsonify({
                'success': False,
                'message': 'No teachers provided'
            }), 400
        
        # Validate number of classes
        if number_of_classes < 1 or number_of_classes > 4:
            return jsonify({
                'success': False,
                'message': 'Number of classes must be between 1 and 4'
            }), 400
        
        # Validate total periods
        total_slots = periods_per_day * days_per_week
        total_required = sum(t['periodsPerWeek'] for t in teachers)
        
        if total_required > total_slots:
            return jsonify({
                'success': False,
                'message': f'Not enough slots! Required: {total_required}, Available: {total_slots}'
            }), 400
        
        # Generate timetable
        generator = TimetableGenerator(teachers, periods_per_day, days_per_week, number_of_classes)
        timetables = generator.generate_timetables()
        
        return jsonify({
            'success': True,
            'timetables': timetables,
            'message': 'Timetable generated successfully'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error generating timetable: {str(e)}'
        }), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'Timetable Generator API is running'})


if __name__ == '__main__':
    print("Starting Timetable Generator Backend...")
    print("Server running on http://localhost:5000")
    print("Press Ctrl+C to stop the server")
    app.run(debug=True, host='0.0.0.0', port=5000)
