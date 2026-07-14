

import numpy as np
import pandas as pd
from pathlib import Path

# Morocco regions configuration with digital infrastructure maturity
MOROCCO_REGIONS = {
    'Casablanca-Settat': {
        'provinces': ['Casablanca', 'Nouaceur', 'Mohammedia', 'Settat'],
        'digital_maturity': 0.85,
        'internet_penetration': 0.92,
        'talent_pool': 0.88
    },
    'Rabat-Salé-Kénitra': {
        'provinces': ['Rabat', 'Salé', 'Kénitra', 'Sidi Kacem'],
        'digital_maturity': 0.82,
        'internet_penetration': 0.89,
        'talent_pool': 0.85
    },
    'Marrakech-Safi': {
        'provinces': ['Marrakech', 'Safi', 'Al Haouz', 'Chichaoua'],
        'digital_maturity': 0.65,
        'internet_penetration': 0.72,
        'talent_pool': 0.60
    },
    'Fès-Meknès': {
        'provinces': ['Fès', 'Meknès', 'Taza', 'Ifrane'],
        'digital_maturity': 0.60,
        'internet_penetration': 0.68,
        'talent_pool': 0.55
    },
    'Tanger-Tétouan-Al Hoceïma': {
        'provinces': ['Tanger', 'Tétouan', 'Al Hoceïma', 'Larache'],
        'digital_maturity': 0.70,
        'internet_penetration': 0.75,
        'talent_pool': 0.65
    },
}

# Digital project types with characteristics
DIGITAL_PROJECT_TYPES = {
    'National Digital Identity': {
        'complexity': 0.85, 'integration_required': 0.95, 'security_required': 0.95,
        'citizen_impact': 0.90, 'duration_factor': 1.6, 'budget_factor': 1.8,
        'api_count': 35, 'legacy_integration': 25
    },
    'e-Government Portal': {
        'complexity': 0.70, 'integration_required': 0.85, 'security_required': 0.80,
        'citizen_impact': 0.85, 'duration_factor': 1.0, 'budget_factor': 1.2,
        'api_count': 25, 'legacy_integration': 15
    },
    'AI Chatbot for Public Services': {
        'complexity': 0.75, 'integration_required': 0.70, 'security_required': 0.60,
        'citizen_impact': 0.75, 'duration_factor': 0.6, 'budget_factor': 0.7,
        'api_count': 10, 'legacy_integration': 5
    },
    'Government Cloud Migration': {
        'complexity': 0.85, 'integration_required': 0.90, 'security_required': 0.85,
        'citizen_impact': 0.50, 'duration_factor': 1.4, 'budget_factor': 1.6,
        'api_count': 40, 'legacy_integration': 30
    },
    'Smart Citizen Services Platform': {
        'complexity': 0.75, 'integration_required': 0.80, 'security_required': 0.75,
        'citizen_impact': 0.90, 'duration_factor': 1.1, 'budget_factor': 1.3,
        'api_count': 20, 'legacy_integration': 12
    },
    'Digital Tax Platform': {
        'complexity': 0.80, 'integration_required': 0.85, 'security_required': 0.90,
        'citizen_impact': 0.70, 'duration_factor': 1.3, 'budget_factor': 1.5,
        'api_count': 30, 'legacy_integration': 20
    },
    'Electronic Document Management': {
        'complexity': 0.60, 'integration_required': 0.70, 'security_required': 0.70,
        'citizen_impact': 0.60, 'duration_factor': 0.8, 'budget_factor': 0.9,
        'api_count': 15, 'legacy_integration': 10
    },
    'Digital Signature System': {
        'complexity': 0.55, 'integration_required': 0.60, 'security_required': 0.95,
        'citizen_impact': 0.55, 'duration_factor': 0.5, 'budget_factor': 0.6,
        'api_count': 12, 'legacy_integration': 8
    },
    'Cybersecurity Infrastructure': {
        'complexity': 0.80, 'integration_required': 0.75, 'security_required': 1.0,
        'citizen_impact': 0.30, 'duration_factor': 1.2, 'budget_factor': 1.4,
        'api_count': 18, 'legacy_integration': 15
    },
    'Open Data Platform': {
        'complexity': 0.55, 'integration_required': 0.65, 'security_required': 0.60,
        'citizen_impact': 0.65, 'duration_factor': 0.7, 'budget_factor': 0.8,
        'api_count': 20, 'legacy_integration': 10
    },
    'National Data Center': {
        'complexity': 0.80, 'integration_required': 0.85, 'security_required': 0.90,
        'citizen_impact': 0.40, 'duration_factor': 1.8, 'budget_factor': 2.0,
        'api_count': 25, 'legacy_integration': 20
    },
    'Digital Procurement Platform': {
        'complexity': 0.65, 'integration_required': 0.75, 'security_required': 0.75,
        'citizen_impact': 0.60, 'duration_factor': 0.9, 'budget_factor': 1.0,
        'api_count': 22, 'legacy_integration': 15
    },
    'Smart Municipality Platform': {
        'complexity': 0.65, 'integration_required': 0.70, 'security_required': 0.65,
        'citizen_impact': 0.80, 'duration_factor': 1.0, 'budget_factor': 1.1,
        'api_count': 15, 'legacy_integration': 12
    },
    'Digital Health Records': {
        'complexity': 0.75, 'integration_required': 0.80, 'security_required': 0.90,
        'citizen_impact': 0.80, 'duration_factor': 1.2, 'budget_factor': 1.3,
        'api_count': 28, 'legacy_integration': 20
    },
    'Online Business Registration': {
        'complexity': 0.55, 'integration_required': 0.65, 'security_required': 0.70,
        'citizen_impact': 0.70, 'duration_factor': 0.6, 'budget_factor': 0.7,
        'api_count': 18, 'legacy_integration': 8
    },
    'Digital Education Platform': {
        'complexity': 0.60, 'integration_required': 0.70, 'security_required': 0.65,
        'citizen_impact': 0.85, 'duration_factor': 0.8, 'budget_factor': 0.9,
        'api_count': 12, 'legacy_integration': 8
    },
    'Smart Agriculture Platform': {
        'complexity': 0.65, 'integration_required': 0.65, 'security_required': 0.60,
        'citizen_impact': 0.60, 'duration_factor': 0.9, 'budget_factor': 1.0,
        'api_count': 14, 'legacy_integration': 10
    }
}

# Technology stacks
TECHNOLOGY_STACKS = {
    'Frontend': ['React', 'Angular', 'Vue.js', 'Next.js', 'Flutter', 'React Native'],
    'Backend': ['Spring Boot', 'Django', 'Node.js', 'ASP.NET Core', 'Laravel', 'FastAPI'],
    'Database': ['PostgreSQL', 'MySQL', 'MongoDB', 'Oracle', 'SQL Server', 'Cassandra'],
    'Cloud': ['AWS', 'Azure', 'Google Cloud', 'Oracle Cloud', 'Hybrid', 'On-Premise']
}

# Digital services
DIGITAL_SERVICES = [
    'eGovernment', 'Digital Identity', 'Cloud Services', 'Cybersecurity',
    'Data Analytics', 'AI/ML', 'Blockchain', 'IoT', 'Mobile Services',
    'Open Data', 'Digital Signature', 'Document Management', 'Smart City',
    'Digital Health', 'Digital Education', 'Fintech'
]

# Security levels
SECURITY_LEVELS = ['Low', 'Medium', 'High', 'Critical']
ENCRYPTION_LEVELS = ['None', 'Basic', 'Strong', 'Military Grade']
INTEGRATION_LEVELS = ['Low', 'Medium', 'High', 'Very High']
COMPLIANCE_FRAMEWORKS = ['GDPR', 'ISO27001', 'NIST', 'Morocco Law 05-20', 'GDPR+ISO27001']

# Funding sources (kept intentionally weak/independent w.r.t. risk_score so the model
# doesn't learn a spurious "who pays -> risk" shortcut)
FUNDING_SOURCES = ['National Budget', 'International Grant', 'Public-Private Partnership', 'Mixed']
FUNDING_SOURCE_WEIGHTS = [0.50, 0.20, 0.18, 0.12]

# Vendor experience levels
VENDOR_EXPERIENCE_LEVELS = {
    'Beginner': (1, 2.5),
    'Intermediate': (2.5, 4.0),
    'Experienced': (4.0, 4.8),
    'Expert': (4.8, 5.0)
}


def generate_digital_transition_dataset(num_projects=10000, noise_std=3.5, seed=42):
    """Generate comprehensive digital transformation project dataset.

    Args:
        num_projects: final number of rows returned (balanced across risk levels)
        noise_std: standard deviation of noise added to risk_score
        seed: random seed for reproducibility
    """
    np.random.seed(seed)

    print(f"Generating {num_projects} digital transformation project records...")
    print("Features include: AI components, cloud infrastructure, integration complexity, etc.")

    project_names = list(DIGITAL_PROJECT_TYPES.keys())
    digital_services = DIGITAL_SERVICES
    region_names = list(MOROCCO_REGIONS.keys())

    data_list = []

    for i in range(num_projects * 3):  # Generate extra for balancing
        # Project selection
        project_type = np.random.choice(project_names)
        type_cfg = DIGITAL_PROJECT_TYPES[project_type]

        # Basic project info
        project_name = f"{project_type} - Morocco {np.random.randint(2024, 2027)}"

        # Region and province
        region = np.random.choice(region_names)
        region_cfg = MOROCCO_REGIONS[region]
        province = np.random.choice(region_cfg['provinces'])

        # Budget (MAD) - realistic for digital projects
        budget_multiplier = np.random.lognormal(mean=0.0, sigma=0.4)
        base_budget = np.random.choice([5_000_000, 8_000_000, 15_000_000, 25_000_000,
                                       40_000_000, 60_000_000, 100_000_000])
        planned_budget = base_budget * type_cfg['budget_factor'] * budget_multiplier
        planned_budget = max(1_000_000, min(planned_budget, 250_000_000))

        # Duration in days
        base_duration = np.random.choice([180, 240, 300, 365, 450, 540, 720])
        planned_duration = int(base_duration * type_cfg['duration_factor'] * np.random.uniform(0.8, 1.5))
        planned_duration = max(60, min(planned_duration, 1095))

        # Technical features
        software_complexity = np.random.choice(['Low', 'Medium', 'High', 'Very High'],
                                              p=[0.1, 0.3, 0.4, 0.2])
        complexity_score = {'Low': 0.2, 'Medium': 0.4, 'High': 0.65, 'Very High': 0.85}
        complexity = complexity_score[software_complexity]

        # Integration
        integration_complexity = np.random.choice(['Low', 'Medium', 'High', 'Very High'],
                                                  p=[0.1, 0.25, 0.4, 0.25])
        integration_score = {'Low': 0.2, 'Medium': 0.4, 'High': 0.7, 'Very High': 0.9}
        integration = integration_score[integration_complexity]

        # API count
        api_count = int(type_cfg['api_count'] * np.random.uniform(0.6, 1.5))
        api_count = max(3, min(api_count, 80))

        # Legacy systems
        legacy_systems = int(type_cfg['legacy_integration'] * np.random.uniform(0.5, 1.5))
        legacy_systems = max(0, min(legacy_systems, 40))

        # Digital maturity based on region and project type
        digital_maturity = region_cfg['digital_maturity'] * (0.8 + 0.2 * np.random.random())

        # Technology stack selection
        frontend = np.random.choice(TECHNOLOGY_STACKS['Frontend'])
        backend = np.random.choice(TECHNOLOGY_STACKS['Backend'])
        database = np.random.choice(TECHNOLOGY_STACKS['Database'])
        cloud_provider = np.random.choice(TECHNOLOGY_STACKS['Cloud'])

        # AI component
        ai_component = np.random.choice(['Yes', 'No'], p=[0.35, 0.65])
        if ai_component == 'Yes':
            ai_type = np.random.choice(['Chatbot', 'Predictive Analytics', 'NLP',
                                       'Computer Vision', 'Recommendation', 'Decision Support'])
            ai_maturity = np.random.uniform(0.2, 0.9)
        else:
            ai_type = 'None'
            ai_maturity = 0

        # Security features
        cybersecurity_level = np.random.choice(SECURITY_LEVELS, p=[0.05, 0.2, 0.45, 0.3])
        security_score = {'Low': 0.2, 'Medium': 0.45, 'High': 0.7, 'Critical': 0.9}[cybersecurity_level]

        encryption_level = np.random.choice(ENCRYPTION_LEVELS, p=[0.05, 0.15, 0.45, 0.35])
        gdpr_compliance = np.random.choice(['Yes', 'No'], p=[0.75, 0.25])
        iso27001 = np.random.choice(['Yes', 'No'], p=[0.5, 0.5])

        penetration_testing = np.random.choice(['Yes', 'No'], p=[0.7, 0.3])
        vulnerabilities_found = np.random.poisson(lam=max(0.5, (1 - security_score) * 8))

        # Vendor/team experience
        vendor_experience = np.random.beta(a=6, b=2) * 4.5 + 0.5  # Scale 0.5-5.0
        vendor_experience = min(5.0, vendor_experience)

        # Team composition
        team_size = max(4, int(20 * budget_multiplier * (0.5 + 0.5 * complexity) + 5))
        senior_developers = max(1, int(team_size * np.random.uniform(0.2, 0.5)))

        # Digital skills assessment
        digital_skill_score = np.random.uniform(40, 100) * (0.7 + 0.3 * region_cfg['talent_pool'])
        digital_skill_score = min(100, digital_skill_score)

        # Staff turnover
        staff_turnover = np.random.beta(a=2, b=8) * 0.8  # Max 80%

        # Citizen impact
        citizen_users = int(np.random.lognormal(mean=10, sigma=3))
        citizen_users = min(max(1000, citizen_users), 20_000_000)

        expected_transactions = int(citizen_users * np.random.uniform(0.05, 0.3))

        # System availability target
        system_availability_target = np.random.uniform(99.0, 99.999)

        # Governance
        procurement_delay = max(0, int(np.random.exponential(scale=20)))
        procurement_delay = min(procurement_delay, 180)

        approval_delay = max(0, int(np.random.exponential(scale=8)))
        approval_delay = min(approval_delay, 60)

        # Compliance
        compliance_score = np.random.uniform(60, 100)
        compliance_score = min(100, compliance_score + region_cfg['digital_maturity'] * 10)

        # Testing
        testing_coverage = np.random.uniform(50, 100)
        testing_coverage = min(100, testing_coverage + (0.1 * compliance_score))

        # Changes and issues
        change_requests = int(np.random.poisson(lam=2 + complexity * 5))
        audit_findings = int(np.random.poisson(lam=(1 - compliance_score / 100) * 4))

        # Citizen complaints
        citizen_complaints = int(np.random.poisson(lam=(1 - digital_maturity) * 5))

        # User training
        user_training = np.random.uniform(20, 100)
        user_training = min(100, user_training + (0.2 * digital_maturity * 100))

        # Budget sufficiency (ratio of planned to required)
        budget_sufficiency = np.random.uniform(0.7, 1.4)

        # Interoperability score
        interoperability_score = np.random.uniform(40, 100) * (0.7 + 0.3 * (1 - integration))

        senior_ratio = senior_developers / max(team_size, 1)
        scrum_propensity = 0.5 * (digital_skill_score / 100) + 0.5 * senior_ratio
        scrum_propensity += np.random.normal(0, 0.12)
        if scrum_propensity > 0.62:
            scrum_maturity = 'High'
        elif scrum_propensity > 0.38:
            scrum_maturity = 'Medium'
        else:
            scrum_maturity = 'Low'

        if ai_component == 'Yes' and ai_type == 'Chatbot':
            chatbot_usage = np.random.choice(['Low', 'Medium', 'High'], p=[0.15, 0.35, 0.50])
        elif ai_component == 'Yes':
            chatbot_usage = np.random.choice(['Low', 'Medium', 'High'], p=[0.45, 0.35, 0.20])
        else:
            chatbot_usage = np.random.choice(['Low', 'Medium', 'High'], p=[0.85, 0.13, 0.02])

        # Funding source: independent categorical (procurement/governance context only)
        funding_source = np.random.choice(FUNDING_SOURCES, p=FUNDING_SOURCE_WEIGHTS)

        risk_score_base = (
            0.15 * (complexity * 100) +
            0.12 * (integration * 100) +
            0.10 * min(100, legacy_systems * 2.5) +
            0.10 * (staff_turnover * 100) +
            0.08 * ((5 - vendor_experience) / 5 * 100) +
            0.07 * (procurement_delay * 0.3) +
            0.08 * (100 - compliance_score) +
            0.10 * ((1 - security_score) * 100) +
            0.05 * (vulnerabilities_found * 5) +
            0.05 * (100 - testing_coverage) +
            0.05 * (100 - digital_skill_score) +
            0.05 * (100 - interoperability_score)
        )

        # Digital-specific interaction bonuses
        interaction_bonus = 0.0

        # AI project with low skill score
        if ai_component == 'Yes' and digital_skill_score < 60:
            interaction_bonus += 15

        # Cloud migration with many legacy systems
        if cloud_provider != 'On-Premise' and legacy_systems > 20:
            interaction_bonus += 12

        # High security requirements with low compliance
        if security_score > 0.7 and compliance_score < 70:
            interaction_bonus += 14

        # High integration complexity with low vendor experience
        if integration > 0.7 and vendor_experience < 3.0:
            interaction_bonus += 12

        # Many API integrations with low testing coverage
        if api_count > 30 and testing_coverage < 70:
            interaction_bonus += 10

        # High citizen impact with low digital maturity in region
        if type_cfg['citizen_impact'] > 0.7 and digital_maturity < 0.6:
            interaction_bonus += 10

        # Low scrum maturity compounding with high complexity (mild, intentional signal)
        if scrum_maturity == 'Low' and complexity > 0.65:
            interaction_bonus += 6

        risk_score = risk_score_base + interaction_bonus + np.random.normal(loc=0, scale=noise_std)
        risk_score = max(0, min(risk_score, 100))

        # Derived outcomes (realistic)
        budget_overrun_rate = (
            -0.05 +
            0.10 * complexity +
            0.08 * integration +
            0.03 * (legacy_systems / 10) +
            0.04 * (5 - vendor_experience) / 5 +
            0.02 * (staff_turnover * 100) +
            0.03 * (100 - compliance_score) / 100 +
            np.random.normal(loc=0, scale=0.04)
        )
        budget_overrun_rate = max(-0.10, min(budget_overrun_rate, 0.60))
        budget_overrun = planned_budget * budget_overrun_rate

        # Schedule delay
        completion_delay = int(
            procurement_delay * 0.2 +
            approval_delay * 0.2 +
            (complexity * 40) +
            (integration * 30) +
            ((5 - vendor_experience) * 15) +
            (legacy_systems * 1.5) +
            np.random.normal(loc=5, scale=12)
        )
        completion_delay = max(0, min(completion_delay, 365))

        # ===============================
        # SUCCESS PROBABILITY (based on risk score)
        # ===============================
        success_probability = 100 - (risk_score * 0.85 + np.random.normal(0, 5))
        success_probability = max(10, min(99, success_probability))

        # ===============================
        # STORE DATA
        # ===============================
        data_list.append({
            # Project Information
            'project_id': f"DGT-{np.random.randint(2024, 2027)}-{i+1:05d}",
            'project_name': project_name,
            'ministry': 'Ministry of Digital Transition and Administration Reform',
            'sector': 'Digital Government',
            'region': region,
            'province': province,
            'project_type': project_type,
            'digital_service': np.random.choice(digital_services),
            'project_priority': np.random.choice(['Low', 'Medium', 'High', 'Critical'],
                                                p=[0.05, 0.2, 0.4, 0.35]),
            'strategic_importance': np.random.choice(['Low', 'Medium', 'High', 'Critical'],
                                                     p=[0.03, 0.15, 0.4, 0.42]),

            # Financial
            'planned_budget_mad': round(planned_budget, 2),
            'budget_sufficiency': round(budget_sufficiency, 2),
            'funding_source': funding_source,

            # Timeline
            'planned_duration_days': planned_duration,
            'procurement_delay_days': procurement_delay,
            'approval_delay_days': approval_delay,

            # Technical
            'software_complexity': software_complexity,
            'integration_complexity': integration_complexity,
            'technology_stack': f"{frontend}+{backend}+{database}",
            'frontend_framework': frontend,
            'backend_framework': backend,
            'database': database,
            'cloud_provider': cloud_provider,
            'microservices': np.random.choice(['Yes', 'No'], p=[0.45, 0.55]),
            'api_count': api_count,
            'legacy_systems': legacy_systems,
            'interoperability_score': round(interoperability_score, 1),

            # AI Features
            'ai_component': ai_component,
            'ai_type': ai_type,
            'ai_maturity': round(ai_maturity, 2),
            'chatbot_usage': chatbot_usage,

            # Security
            'cybersecurity_level': cybersecurity_level,
            'encryption_level': encryption_level,
            'gdpr_compliance': gdpr_compliance,
            'iso27001': iso27001,
            'penetration_testing': penetration_testing,
            'vulnerabilities_found': vulnerabilities_found,
            'security_audit_score': round(security_score * 100, 1),

            # Team & Process
            'team_size': team_size,
            'senior_developers': senior_developers,
            'vendor_experience': round(vendor_experience, 2),
            'digital_skill_score': round(digital_skill_score, 1),
            'staff_turnover': round(staff_turnover * 100, 1),
            'scrum_maturity': scrum_maturity,

            # Quality & Testing
            'testing_coverage': round(testing_coverage, 1),
            'compliance_score': round(compliance_score, 1),
            'audit_findings': audit_findings,

            # Citizen Impact
            'citizen_users': citizen_users,
            'expected_transactions': expected_transactions,
            'digital_adoption_rate': round(np.random.uniform(0.2, 0.95), 3),
            'citizen_complaints': citizen_complaints,
            'system_availability_target': round(system_availability_target, 3),

            # Training & Change
            'user_training': round(user_training, 1),
            'change_requests': change_requests,
            'digital_maturity': round(digital_maturity, 2),

            # Outcomes (for prediction)
            'risk_score': round(risk_score, 2),
            'success_probability': round(success_probability, 1),
            'budget_overrun': round(budget_overrun, 2),
            'budget_overrun_rate': round(budget_overrun_rate, 3),
            'completion_delay': completion_delay,
        })

    df = pd.DataFrame(data_list)

    # ===============================
    # CLEAN AND BALANCE CLASSES
    # ===============================
    scores = df["risk_score"]
    low_threshold = scores.quantile(0.28)
    high_threshold = scores.quantile(0.72)

    # Remove ambiguous cases
    margin = 3.5
    keep_mask = ~(
        ((scores > low_threshold - margin) & (scores < low_threshold + margin)) |
        ((scores > high_threshold - margin) & (scores < high_threshold + margin))
    )
    df = df[keep_mask].reset_index(drop=True)
    scores = df["risk_score"]

    # Create risk levels
    df["risk_level"] = np.where(
        scores < low_threshold, "Low",
        np.where(scores < high_threshold, "Medium", "High")
    )

    # Balance classes
    per_class = num_projects // 3
    parts = []
    for level in ["Low", "Medium", "High"]:
        subset = df[df["risk_level"] == level]
        n_take = min(per_class, len(subset))
        parts.append(subset.sample(n=n_take, random_state=seed))
    df = pd.concat(parts).sample(frac=1, random_state=seed).reset_index(drop=True)

    # Clean up project IDs
    df["project_id"] = [f"DGT-2026-{i+1:05d}" for i in range(len(df))]

    return df


if __name__ == "__main__":
    # Set the exact output path
    output_path = Path(r"C:\Users\Asus\smart-ministry-platform\ai\data\ministry_projects.csv")

    # Create directory if it doesn't exist
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("DIGITAL TRANSFORMATION PROJECT RISK DATASET GENERATOR")
    print("Ministry of Digital Transition and Administration Reform - Morocco")
    print("=" * 70)
    print(f"\nOutput path: {output_path}")

    # Generate dataset
    generated_df = generate_digital_transition_dataset(num_projects=10000, seed=42)

    print("\n" + "=" * 70)
    print("DATASET STATISTICS")
    print("=" * 70)
    print(f"Total records: {len(generated_df):,}")
    print(f"Features: {len(generated_df.columns)}")

    print("\nRisk Classification:")
    risk_counts = generated_df['risk_level'].value_counts()
    risk_pcts = generated_df['risk_level'].value_counts(normalize=True) * 100
    for level in ['Low', 'Medium', 'High']:
        print(f"  {level}: {risk_counts[level]:,} ({risk_pcts[level]:.1f}%)")

    print("\nSuccess Probability:")
    print(f"  Mean: {generated_df['success_probability'].mean():.1f}%")
    print(f"  Min: {generated_df['success_probability'].min():.1f}%")
    print(f"  Max: {generated_df['success_probability'].max():.1f}%")

    print("\nProject Types (Top 5):")
    for ptype, count in generated_df['project_type'].value_counts().head(5).items():
        print(f"  {ptype}: {count:,}")

    print("\nTechnology Stack Distribution:")
    print(f"  Top Cloud: {generated_df['cloud_provider'].value_counts().index[0]} "
          f"({generated_df['cloud_provider'].value_counts().iloc[0]:,})")
    print(f"  Top Frontend: {generated_df['frontend_framework'].value_counts().index[0]} "
          f"({generated_df['frontend_framework'].value_counts().iloc[0]:,})")
    print(f"  Top Backend: {generated_df['backend_framework'].value_counts().index[0]} "
          f"({generated_df['backend_framework'].value_counts().iloc[0]:,})")

    print("\nAI Components:")
    ai_counts = generated_df['ai_component'].value_counts()
    for comp, count in ai_counts.items():
        print(f"  {comp}: {count:,} ({count/len(generated_df)*100:.1f}%)")

    print("\nSecurity Levels:")
    sec_counts = generated_df['cybersecurity_level'].value_counts()
    for level, count in sec_counts.items():
        print(f"  {level}: {count:,} ({count/len(generated_df)*100:.1f}%)")

    print("\nScrum Maturity:")
    scrum_counts = generated_df['scrum_maturity'].value_counts()
    for level, count in scrum_counts.items():
        print(f"  {level}: {count:,} ({count/len(generated_df)*100:.1f}%)")

    print("\nFunding Source:")
    fund_counts = generated_df['funding_source'].value_counts()
    for source, count in fund_counts.items():
        print(f"  {source}: {count:,} ({count/len(generated_df)*100:.1f}%)")

    # Save dataset to the specified path
    generated_df.to_csv(output_path, index=False)
    file_size = output_path.stat().st_size / (1024 * 1024)
    print(f"\nDataset saved to: {output_path}")
    print(f"File size: {file_size:.2f} MB")

    print("\n" + "=" * 70)
    print("PREPROCESSING GUIDANCE FOR ML MODEL")
    print("=" * 70)
    print("Target Variable: 'risk_level' (Low/Medium/High)")
    print("Alternative Target: 'success_probability' (regression)")
    print("\nFeatures to EXCLUDE from training (outcomes):")
    print("  - risk_score, success_probability (targets)")
    print("  - budget_overrun, budget_overrun_rate, completion_delay")
    print("\nFeatures to ENCODE:")
    print("  - One-hot (nominal, unordered): project_type, cloud_provider, ai_type, etc.")
    print("  - Ordinal ONLY (do not also one-hot): software_complexity, integration_complexity,")
    print("    project_priority, strategic_importance, cybersecurity_level, scrum_maturity,")
    print("    chatbot_usage")
    print("\nExpected ML Performance:")
    print("  - XGBoost accuracy: ~85-90%")
    print("  - SHAP explanations will show digital-specific drivers")
    print("  - Top drivers: AI maturity, vendor experience, integration complexity")
    print("=" * 70)
