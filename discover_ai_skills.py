import os
import shutil
import subprocess
import sys

def clone_repo(url, target_dir):
    if os.path.exists(target_dir):
        def on_rm_error(func, path, exc_info):
            os.chmod(path, 0o777)
            try:
                func(path)
            except Exception:
                pass 
        shutil.rmtree(target_dir, onerror=on_rm_error)
        
    subprocess.run(["git", "clone", url, target_dir, "--depth", "1"], check=True, capture_output=True)

def get_local_skills(skills_dir):
    if not os.path.exists(skills_dir):
        return set()
    return {d for d in os.listdir(skills_dir) if os.path.isdir(os.path.join(skills_dir, d)) and not d.startswith('.')}

def get_remote_skills(repo_dir):
    skills_path = os.path.join(repo_dir, "skills")
    if not os.path.exists(skills_path):
        return {}
    
    skills = {}
    for d in os.listdir(skills_path):
        d_path = os.path.join(skills_path, d)
        if os.path.isdir(d_path):
            desc = ""
            skill_md = os.path.join(d_path, "SKILL.md")
            if os.path.exists(skill_md):
                try:
                    with open(skill_md, 'r', encoding='utf-8') as f:
                        content = f.read()
                        desc = content[:500].lower() 
                except:
                    pass
            skills[d] = desc
    return skills

def score_skill(name, desc, goals):
    score = 0
    text = (name + " " + desc).lower()
    for goal in goals:
        if goal in text:
            score += 1
            
    # Boost for specific AI keywords
    keywords = ["agent", "rag", "memory", "chain", "langchain", "reasoning", "persona", "coach", "chat", "conversation", "voice", "llm", "ai"]
    for k in keywords:
        if k in text:
            score += 0.5
            
    return score

def main():
    repo_url = "https://github.com/sickn33/antigravity-awesome-skills.git"
    temp_path = os.path.abspath("temp_ai_skill_discovery")
    skills_dir = r"c:\Users\rvill\.gemini\antigravity\skills"

    print(f"Cloning {repo_url} into {temp_path}...")
    try:
        clone_repo(repo_url, temp_path)
    except Exception as e:
        print(f"Error cloning repo: {e}")
        return

    local = get_local_skills(skills_dir)
    remote_map = get_remote_skills(temp_path)
    
    missing = set(remote_map.keys()) - local
    
    # AI Focused Goals
    goals = ["agent", "coach", "memory", "rag", "chain", "reasoning", "ai", "llm", "chat", "voice"]
    
    recommendations = []
    for skill_name in missing:
        desc = remote_map[skill_name]
        score = score_skill(skill_name, desc, goals)
        if score > 0:
            recommendations.append((score, skill_name, desc.split('\n')[0]))

    recommendations.sort(key=lambda x: x[0], reverse=True)

    print("\n# AI Skill Recommendations Report")
    print("Based on your goals: AI Coach Improvements\n")
    
    if not recommendations:
        print("No new relevant skills found matching your criteria.")
    else:
        for score, name, desc_snippet in recommendations[:10]:
            print(f"### {name} (Score: {score})")
            print(f"- Description snippet: {desc_snippet[:100]}...")
            print(f"- Suggested action: Import this skill manually.\n")

    if os.path.exists(temp_path):
        def on_rm_error(func, path, exc_info):
            os.chmod(path, 0o777)
            try:
                func(path)
            except Exception:
                pass
        shutil.rmtree(temp_path, onerror=on_rm_error)

if __name__ == "__main__":
    main()
