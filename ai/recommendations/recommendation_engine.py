"""
recommendation_engine.py - Project recommendation engine
"""

import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
import joblib
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))
from config import *

class RecommendationEngine:
    def __init__(self):
        self.projects_df = None
        self.feature_matrix = None
        self.similarity_matrix = None
        self.scaler = StandardScaler()
        self.load_data()
        self.build_feature_matrix()
        
    def load_data(self):
        """Load project data"""
        data_path = PROCESSED_DATA_PATH
        if not data_path.exists():
            # Try raw data if processed doesn't exist
            data_path = RAW_DATA_PATH
            if not data_path.exists():
                raise FileNotFoundError("No data found. Run preprocess.py first.")
        
        self.projects_df = pd.read_csv(data_path)
        
        # Create a project_id if it doesn't exist
        if 'project_id' not in self.projects_df.columns:
            # Generate project IDs
            self.projects_df['project_id'] = ['PRJ-' + str(i).zfill(6) for i in range(len(self.projects_df))]
        
        # Create project name if it doesn't exist
        if 'project_name' not in self.projects_df.columns:
            self.projects_df['project_name'] = self.projects_df.apply(
                lambda x: f"{x.get('ministry', 'Project')} - {x.get('project_type', 'Type')}", 
                axis=1
            )
        
        print(f"✅ Loaded {len(self.projects_df)} projects")
        
    def build_feature_matrix(self):
        """Build feature matrix for recommendations"""
        # Select features for recommendation
        feature_cols = []
        
        # Categorical features
        categorical_cols = ['ministry', 'project_type', 'status', 'location', 'priority']
        for col in categorical_cols:
            if col in self.projects_df.columns:
                feature_cols.append(col)
        
        # Numerical features
        numerical_cols = ['budget', 'budget_utilization', 'project_duration_days']
        for col in numerical_cols:
            if col in self.projects_df.columns:
                feature_cols.append(col)
        
        # Create feature matrix
        if feature_cols:
            # Handle categorical features
            cat_features = [col for col in feature_cols if col in categorical_cols]
            num_features = [col for col in feature_cols if col in numerical_cols]
            
            # Create a copy of data for encoding
            feature_data = self.projects_df[feature_cols].copy()
            
            # Encode categorical variables
            for col in cat_features:
                if col in feature_data.columns:
                    # Use label encoding
                    feature_data[col] = feature_data[col].astype('category').cat.codes
            
            # Handle missing values
            feature_data = feature_data.fillna(0)
            
            # Scale numerical features
            if num_features:
                feature_data[num_features] = self.scaler.fit_transform(feature_data[num_features])
            
            self.feature_matrix = feature_data.values
        else:
            # Fallback: use project type and ministry only
            self.feature_matrix = np.zeros((len(self.projects_df), 2))
            if 'ministry' in self.projects_df.columns:
                self.feature_matrix[:, 0] = self.projects_df['ministry'].astype('category').cat.codes
            if 'project_type' in self.projects_df.columns:
                self.feature_matrix[:, 1] = self.projects_df['project_type'].astype('category').cat.codes
        
        # Compute similarity matrix
        self.similarity_matrix = cosine_similarity(self.feature_matrix)
        print(f"✅ Built feature matrix with shape: {self.feature_matrix.shape}")
        
    def get_similar_projects(self, project_id=None, project_idx=None, n_recommendations=5):
        """
        Get similar projects based on project ID or index
        
        Args:
            project_id: Project ID (str)
            project_idx: Index of project (int)
            n_recommendations: Number of recommendations to return
        
        Returns:
            DataFrame with similar projects
        """
        if project_id is not None:
            # Find project by ID
            if 'project_id' in self.projects_df.columns:
                matching = self.projects_df[self.projects_df['project_id'] == project_id]
                if matching.empty:
                    # Try to find by index if project_id is numeric
                    try:
                        idx = int(project_id)
                        if idx < len(self.projects_df):
                            project_idx = idx
                        else:
                            raise ValueError(f"Project {project_id} not found")
                    except ValueError:
                        raise ValueError(f"Project {project_id} not found")
                else:
                    project_idx = matching.index[0]
            else:
                raise ValueError("Project ID column not found")
        
        if project_idx is None:
            raise ValueError("Either project_id or project_idx must be provided")
        
        if project_idx >= len(self.projects_df):
            raise ValueError(f"Project index {project_idx} out of range")
        
        # Get similarity scores
        similarity_scores = self.similarity_matrix[project_idx]
        
        # Get top similar projects (excluding the project itself)
        similar_indices = np.argsort(similarity_scores)[::-1]
        similar_indices = similar_indices[similar_indices != project_idx][:n_recommendations]
        
        # Get the similar projects
        similar_projects = self.projects_df.iloc[similar_indices].copy()
        similar_projects['similarity_score'] = similarity_scores[similar_indices]
        
        return similar_projects
    
    def get_recommendations_by_criteria(self, criteria, n_recommendations=5):
        """
        Get project recommendations based on criteria
        
        Args:
            criteria: dict with project criteria (ministry, project_type, budget range, etc.)
            n_recommendations: Number of recommendations to return
        
        Returns:
            DataFrame with recommended projects
        """
        # Start with all projects
        recommendations = self.projects_df.copy()
        
        # Apply filters based on criteria
        if 'ministry' in criteria and criteria['ministry']:
            recommendations = recommendations[recommendations['ministry'] == criteria['ministry']]
        
        if 'project_type' in criteria and criteria['project_type']:
            recommendations = recommendations[recommendations['project_type'] == criteria['project_type']]
        
        if 'location' in criteria and criteria['location']:
            recommendations = recommendations[recommendations['location'] == criteria['location']]
        
        if 'min_budget' in criteria and criteria['min_budget']:
            recommendations = recommendations[recommendations['budget'] >= criteria['min_budget']]
        
        if 'max_budget' in criteria and criteria['max_budget']:
            recommendations = recommendations[recommendations['budget'] <= criteria['max_budget']]
        
        # Sort by budget utilization (lower is better)
        if 'budget_utilization' in recommendations.columns:
            recommendations = recommendations.sort_values('budget_utilization', ascending=True)
        
        # Return top N
        return recommendations.head(n_recommendations)
    
    def get_feature_based_recommendations(self, project_features, n_recommendations=5):
        """
        Get recommendations based on feature vector
        
        Args:
            project_features: dict or array of features
            n_recommendations: Number of recommendations to return
        
        Returns:
            DataFrame with recommended projects
        """
        # Convert input to feature vector
        if isinstance(project_features, dict):
            # Create a feature vector from dict
            feature_vector = np.zeros(self.feature_matrix.shape[1])
            # Map dict values to features
            # This is simplified - in practice, you'd map properly
            for i, col in enumerate(['ministry', 'project_type', 'status', 'location', 'priority', 
                                    'budget', 'budget_utilization', 'project_duration_days']):
                if col in project_features and i < len(feature_vector):
                    if isinstance(project_features[col], (int, float)):
                        feature_vector[i] = project_features[col]
                    else:
                        # Categorical - use encoding
                        feature_vector[i] = 0
        else:
            feature_vector = project_features
        
        # Reshape for similarity computation
        feature_vector = feature_vector.reshape(1, -1)
        
        # Compute similarity with all projects
        similarity_scores = cosine_similarity(feature_vector, self.feature_matrix)[0]
        
        # Get top similar projects
        similar_indices = np.argsort(similarity_scores)[::-1][:n_recommendations]
        
        recommendations = self.projects_df.iloc[similar_indices].copy()
        recommendations['similarity_score'] = similarity_scores[similar_indices]
        
        return recommendations

def main():
    """Demonstrate recommendation engine"""
    print("📊 Recommendation Engine Demo")
    print("=" * 50)
    
    # Initialize engine
    engine = RecommendationEngine()
    
    # Demo 1: Get similar projects to a specific project
    print("\n1. Similar Projects Example:")
    
    # Get first project ID if available
    if 'project_id' in engine.projects_df.columns and len(engine.projects_df) > 0:
        first_project_id = engine.projects_df['project_id'].iloc[0]
        print(f"   Finding projects similar to: {first_project_id}")
        similar = engine.get_similar_projects(first_project_id, n_recommendations=3)
        
        if not similar.empty:
            print(f"\n   Top 3 similar projects:")
            for idx, row in similar.iterrows():
                project_name = row.get('project_name', f"Project {row.get('project_id', idx)}")
                similarity = row.get('similarity_score', 0)
                print(f"      - {project_name} (Similarity: {similarity:.3f})")
        else:
            print("   No similar projects found")
    
    # Demo 2: Recommendations by criteria
    print("\n2. Recommendations by Criteria:")
    criteria = {
        'ministry': 'Health',
        'min_budget': 1000000,
        'max_budget': 10000000
    }
    print(f"   Criteria: {criteria}")
    recommendations = engine.get_recommendations_by_criteria(criteria, n_recommendations=3)
    
    if not recommendations.empty:
        print(f"\n   Top 3 projects matching criteria:")
        for idx, row in recommendations.iterrows():
            project_name = row.get('project_name', f"Project {row.get('project_id', idx)}")
            budget = row.get('budget', 0)
            print(f"      - {project_name} (Budget: ${budget:,.2f})")
    else:
        print("   No projects found matching criteria")
    
    # Demo 3: Feature-based recommendations
    print("\n3. Feature-based Recommendations:")
    # Use an existing project as example
    if len(engine.projects_df) > 0:
        sample_idx = 0
        sample_features = engine.feature_matrix[sample_idx]
        print(f"   Finding projects similar to first project based on features...")
        feature_recommendations = engine.get_feature_based_recommendations(
            sample_features, n_recommendations=3
        )
        
        if not feature_recommendations.empty:
            print(f"\n   Top 3 feature-based recommendations:")
            for idx, row in feature_recommendations.iterrows():
                project_name = row.get('project_name', f"Project {row.get('project_id', idx)}")
                similarity = row.get('similarity_score', 0)
                print(f"      - {project_name} (Similarity: {similarity:.3f})")
        else:
            print("   No feature-based recommendations found")

if __name__ == "__main__":
    main()