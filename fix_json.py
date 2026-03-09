import json
import re

# Read the file
with open('backend/district wise upazila data.json', 'r', encoding='utf-8') as f:
    content = f.read()

# Split by root objects
objects = []
current_obj_start = 0
brace_count = 0
in_string = False
escape_next = False

for i, char in enumerate(content):
    if escape_next:
        escape_next = False
        continue
    
    if char == '\\':
        escape_next = True
        continue
        
    if char == '"' and not escape_next:
        in_string = not in_string
        continue
    
    if not in_string:
        if char == '{':
            if brace_count == 0:
                current_obj_start = i
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                obj_str = content[current_obj_start:i+1]
                try:
                    obj = json.loads(obj_str)
                    objects.append(obj)
                except:
                    pass

# Now combine all divisions into one array
if len(objects) > 1:
    # First object should have the "divisions" array
    main_obj = objects[0]
    
    # Rest should be individual divisions
    for obj in objects[1:]:
        if 'division' in obj and 'districts' in obj:
            main_obj['divisions'].append(obj)
    
    # Write back with proper formatting
    with open('backend/district wise upazila data.json', 'w', encoding='utf-8') as f:
        json.dump(main_obj, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Fixed! Combined {len(objects)} root objects into 1 with {len(main_obj['divisions'])} divisions")
else:
    print("File seems okay")
