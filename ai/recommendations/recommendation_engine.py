"""
recommendation_engine.py - Project recommendation engine for the Smart Ministry Platform
Ministry of Digital Transition and Administration Reform - Morocco

This engine provides project recommendations based on similarity analysis,
criteria filtering, and feature-based matching. It uses the trained XGBoost
model to assess project risk and provides data-driven recommendations.
"""

import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
import joblib
import sys
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Union, Any
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).resolve().parent.parent))
from config import *

# Import risk explainer for risk assessment integration
try:
    from shap_explainer import RiskExplainer
except ImportError:
    logger.warning("RiskExplainer not available. Risk assessment features will be disabled.")
    RiskExplainer = None


class RecommendationEngine:
    """
    Project recommendation engine that combines collaborative filtering,
    content-based filtering, and risk assessment.
    """
    
    def __init__(self, model_dir: str = 'models', use_risk_model: bool = True):
        """
        Initialize the recommendation engine.
        
        Args:
            model_dir: Directory containing model artifacts
            use_risk_model: Whether to integrate risk assessment
        """
        self.model_dir = Path(model_dir)
        self.use_risk_model = use_risk_model
        
        # Data storage
        self.projects_df = None
        self.feature_matrix = None
        self.similarity_matrix = None
        self.scaler = StandardScaler()
        self.risk_explainer = None
        
        # Feature definitions
        self.categorical_features = ['ministry', 'project_type', 'status', 'location', 'priority']
        self.numerical_features = ['budget', 'budget_utilization', 'project_duration_days', 
                                   'success_rate', 'risk_score']
        
        # Load data and build matrices
        self.load_data()
        self.build_feature_matrix()
        
        # Initialize risk model if available
        if self.use_risk_model and RiskExplainer is not None:
            try:
                self.risk_explainer = RiskExplainer(model_dir=str(self.model_dir))
                logger.info("RiskExplainer initialized successfully")
            except Exception as e:
                logger.warning(f"Could not initialize RiskExplainer: {e}")
                self.risk_explainer = None
        
        logger.info(f"RecommendationEngine initialized with {len(self.projects_df)} projects")
        
    def load_data(self) -> None:
        """Load project data from processed or raw data files."""
        # Try processed data first
        data_path = PROCESSED_DATA_PATH
        if not data_path.exists():
            # Try raw data if processed doesn't exist
            data_path = RAW_DATA_PATH
            if not data_path.exists():
                raise FileNotFoundError("No data found. Run preprocess.py first.")
        
        self.projects_df = pd.read_csv(data_path)
        
        # Generate project IDs if not present
        if 'project_id' not in self.projects_df.columns:
            self.projects_df['project_id'] = ['PRJ-' + str(i).zfill(6) for i in range(len(self.projects_df))]
        
        # Generate project names if not present
        if 'project_name' not in self.projects_df.columns:
            self.projects_df['project_name'] = self.projects_df.apply(
                lambda x: f"{x.get('ministry', 'Unspecified')} - {x.get('project_type', 'Project')}", 
                axis=1
            )
        
        # Ensure required columns exist with defaults
        default_columns = {
            'status': 'Active',
            'location': 'Unknown',
            'priority': 'Medium',
            'budget_utilization': 0.5,
            'success_rate': 0.7,
            'risk_score': 50.0,
            'project_duration_days': 365
        }
        
        for col, default_val in default_columns.items():
            if col not in self.projects_df.columns:
                self.projects_df[col] = default_val
        
        logger.info(f"Loaded {len(self.projects_df)} projects")
        
    def build_feature_matrix(self) -> None:
        """Build feature matrix for similarity calculations."""
        # Select features for recommendations
        available_categorical = [col for col in self.categorical_features if col in self.projects_df.columns]
        available_numerical = [col for col in self.numerical_features if col in self.projects_df.columns]
        
        if not available_categorical and not available_numerical:
            logger.warning("No features available for recommendation matrix")
            self.feature_matrix = np.zeros((len(self.projects_df), 1))
            self.similarity_matrix = np.ones((len(self.projects_df), len(self.projects_df)))
            return
        
        # Create feature matrix
        feature_data = pd.DataFrame()
        
        # Process categorical features
        for col in available_categorical:
            # Use label encoding for categorical features
            if col in self.projects_df.columns:
                feature_data[f'{col}_encoded'] = self.projects_df[col].astype('category').cat.codes
        
        # Process numerical features
        for col in available_numerical:
            if col in self.projects_df.columns:
                feature_data[col] = self.projects_df[col].fillna(0)
        
        # Handle missing values
        feature_data = feature_data.fillna(0)
        
        # Scale features
        if len(feature_data.columns) > 0:
            self.feature_matrix = self.scaler.fit_transform(feature_data)
        else:
            self.feature_matrix = np.zeros((len(self.projects_df), 1))
        
        # Compute similarity matrix
        self.similarity_matrix = cosine_similarity(self.feature_matrix)
        logger.info(f"Built feature matrix with shape: {self.feature_matrix.shape}")
        
    def get_project_by_id(self, project_id: str) -> Optional[pd.Series]:
        """Get a project by its ID."""
        if 'project_id' not in self.projects_df.columns:
            return None
        
        matching = self.projects_df[self.projects_df['project_id'] == project_id]
        if matching.empty:
            return None
        return matching.iloc[0]
    
    def get_project_by_index(self, idx: int) -> Optional[pd.Series]:
        """Get a project by its index."""
        if idx < 0 or idx >= len(self.projects_df):
            return None
        return self.projects_df.iloc[idx]
    
    def get_similar_projects(
        self, 
        project_id: Optional[str] = None, 
        project_idx: Optional[int] = None, 
        n_recommendations: int = 5,
        min_similarity: float = 0.1
    ) -> pd.DataFrame:
        """
        Get similar projects based on project ID or index.
        
        Args:
            project_id: Project ID (str)
            project_idx: Index of project (int)
            n_recommendations: Number of recommendations to return
            min_similarity: Minimum similarity score threshold
        
        Returns:
            DataFrame with similar projects including similarity scores
        
        Raises:
            ValueError: If project not found or invalid parameters
        """
        # Find project index
        if project_id is not None:
            project = self.get_project_by_id(project_id)
            if project is None:
                # Try numeric ID as index
                try:
                    idx = int(project_id)
                    if idx < len(self.projects_df):
                        project_idx = idx
                    else:
                        raise ValueError(f"Project '{project_id}' not found")
                except ValueError:
                    raise ValueError(f"Project '{project_id}' not found")
            else:
                project_idx = self.projects_df[self.projects_df['project_id'] == project_id].index[0]
        
        if project_idx is None:
            raise ValueError("Either project_id or project_idx must be provided")
        
        if project_idx >= len(self.projects_df):
            raise ValueError(f"Project index {project_idx} out of range")
        
        # Get similarity scores
        similarity_scores = self.similarity_matrix[project_idx]
        
        # Get project information
        source_project = self.projects_df.iloc[project_idx]
        
        # Filter by minimum similarity threshold
        valid_indices = np.where(similarity_scores >= min_similarity)[0]
        valid_indices = valid_indices[valid_indices != project_idx]
        
        if len(valid_indices) == 0:
            logger.info(f"No projects with similarity >= {min_similarity} found")
            return pd.DataFrame()
        
        # Sort by similarity
        sorted_indices = valid_indices[np.argsort(similarity_scores[valid_indices])[::-1]]
        top_indices = sorted_indices[:n_recommendations]
        
        # Create recommendations DataFrame
        recommendations = self.projects_df.iloc[top_indices].copy()
        recommendations['similarity_score'] = similarity_scores[top_indices]
        recommendations['similarity_percentage'] = recommendations['similarity_score'] * 100
        
        # Add source project info
        recommendations['source_project_id'] = source_project.get('project_id', 'Unknown')
        recommendations['source_project_name'] = source_project.get('project_name', 'Unknown')
        
        # Sort by similarity descending
        recommendations = recommendations.sort_values('similarity_score', ascending=False)
        
        logger.info(f"Found {len(recommendations)} similar projects")
        return recommendations
    
    def get_recommendations_by_criteria(
        self, 
        criteria: Dict[str, Any], 
        n_recommendations: int = 5,
        sort_by: str = 'budget_utilization',
        ascending: bool = True
    ) -> pd.DataFrame:
        """
        Get project recommendations based on filtering criteria.
        
        Args:
            criteria: Dictionary with project criteria
                - ministry: Ministry name
                - project_type: Type of project
                - location: Project location
                - min_budget: Minimum budget
                - max_budget: Maximum budget
                - status: Project status
                - priority: Project priority
            n_recommendations: Number of recommendations to return
            sort_by: Column to sort results by
            ascending: Sort order
        
        Returns:
            DataFrame with recommended projects
        """
        # Start with all projects
        recommendations = self.projects_df.copy()
        
        # Apply filters
        filter_mapping = {
            'ministry': lambda df, val: df[df['ministry'] == val],
            'project_type': lambda df, val: df[df['project_type'] == val],
            'location': lambda df, val: df[df['location'] == val],
            'status': lambda df, val: df[df['status'] == val],
            'priority': lambda df, val: df[df['priority'] == val],
            'min_budget': lambda df, val: df[df['budget'] >= val],
            'max_budget': lambda df, val: df[df['budget'] <= val],
        }
        
        for key, value in criteria.items():
            if key in filter_mapping and value is not None and value != '':
                try:
                    recommendations = filter_mapping[key](recommendations, value)
                except Exception as e:
                    logger.warning(f"Error applying filter {key}={value}: {e}")
        
        # Sort results
        if sort_by in recommendations.columns:
            recommendations = recommendations.sort_values(sort_by, ascending=ascending)
        
        # Return top N
        result = recommendations.head(n_recommendations)
        
        # Add match score (percentage of criteria matched)
        if len(result) > 0:
            result['match_score'] = self._calculate_match_scores(result, criteria)
        
        logger.info(f"Found {len(result)} projects matching criteria")
        return result
    
    def _calculate_match_scores(self, df: pd.DataFrame, criteria: Dict[str, Any]) -> pd.Series:
        """
        Calculate match scores for each project based on criteria.
        
        Args:
            df: DataFrame of projects
            criteria: Dictionary of criteria
        
        Returns:
            Series with match scores (0-100)
        """
        total_criteria = len([k for k in criteria.keys() if k not in ['min_budget', 'max_budget']])
        if total_criteria == 0:
            return pd.Series([100] * len(df))
        
        match_scores = []
        
        for idx, row in df.iterrows():
            matches = 0
            for key, value in criteria.items():
                if key in ['min_budget', 'max_budget']:
                    continue
                if key in row and row[key] == value:
                    matches += 1
            
            score = (matches / total_criteria) * 100
            match_scores.append(score)
        
        return pd.Series(match_scores)
    
    def get_feature_based_recommendations(
        self, 
        project_features: Union[Dict, np.ndarray], 
        n_recommendations: int = 5,
        min_similarity: float = 0.1
    ) -> pd.DataFrame:
        """
        Get recommendations based on a feature vector.
        
        Args:
            project_features: Dictionary of features or feature array
            n_recommendations: Number of recommendations to return
            min_similarity: Minimum similarity score threshold
        
        Returns:
            DataFrame with recommended projects
        """
        # Convert input to feature vector
        if isinstance(project_features, dict):
            feature_vector = self._dict_to_feature_vector(project_features)
        elif isinstance(project_features, np.ndarray):
            feature_vector = project_features
        else:
            raise ValueError("project_features must be dict or numpy array")
        
        # Ensure correct shape
        if feature_vector.ndim == 1:
            feature_vector = feature_vector.reshape(1, -1)
        
        # Compute similarity with all projects
        similarity_scores = cosine_similarity(feature_vector, self.feature_matrix)[0]
        
        # Filter by minimum similarity
        valid_indices = np.where(similarity_scores >= min_similarity)[0]
        
        if len(valid_indices) == 0:
            logger.info(f"No projects with similarity >= {min_similarity} found")
            return pd.DataFrame()
        
        # Get top similar projects
        sorted_indices = valid_indices[np.argsort(similarity_scores[valid_indices])[::-1]]
        top_indices = sorted_indices[:n_recommendations]
        
        recommendations = self.projects_df.iloc[top_indices].copy()
        recommendations['similarity_score'] = similarity_scores[top_indices]
        recommendations['similarity_percentage'] = recommendations['similarity_score'] * 100
        
        logger.info(f"Found {len(recommendations)} feature-based recommendations")
        return recommendations
    
    def _dict_to_feature_vector(self, features: Dict[str, Any]) -> np.ndarray:
        """
        Convert a dictionary of features to a feature vector.
        
        Args:
            features: Dictionary of feature values
        
        Returns:
            Numpy array feature vector
        """
        # Get available features from the feature matrix
        n_features = self.feature_matrix.shape[1]
        
        # If we have a mapping, use it
        if hasattr(self, '_feature_mapping'):
            feature_vector = np.zeros(n_features)
            for key, idx in self._feature_mapping.items():
                if key in features:
                    feature_vector[idx] = features[key]
            return feature_vector
        
        # Otherwise, try to use the scaler
        try:
            # Create a DataFrame with the same columns as used for fitting
            feature_df = pd.DataFrame([features])
            
            # Ensure all required columns exist
            for col in self.categorical_features + self.numerical_features:
                if col not in feature_df.columns:
                    feature_df[col] = 0
            
            # Encode categorical features
            for col in self.categorical_features:
                if col in feature_df.columns:
                    # Use the same encoding as the training data
                    if col in self.projects_df.columns:
                        # Map values to codes
                        categories = self.projects_df[col].astype('category')
                        feature_df[col] = feature_df[col].map(
                            dict(zip(categories.cat.categories, categories.cat.codes))
                        ).fillna(0)
            
            # Fill missing values
            feature_df = feature_df.fillna(0)
            
            # Scale numerical features
            for col in self.numerical_features:
                if col in feature_df.columns and col not in self.categorical_features:
                    feature_df[col] = self.scaler.transform(feature_df[[col]])[0][0]
            
            # Convert to numpy array
            return feature_df.values[0]
            
        except Exception as e:
            logger.warning(f"Error converting dict to feature vector: {e}")
            # Fallback to zeros
            return np.zeros(n_features)
    
    def assess_project_risk(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assess risk for a project using the trained model.
        
        Args:
            project_data: Dictionary of project features
        
        Returns:
            Dictionary with risk assessment results
        """
        if self.risk_explainer is None:
            return {'error': 'Risk model not available'}
        
        try:
            result = self.risk_explainer.explain_prediction(project_data)
            return result
        except Exception as e:
            logger.error(f"Risk assessment failed: {e}")
            return {'error': str(e)}
    
    def get_risk_adjusted_recommendations(
        self, 
        project_id: Optional[str] = None,
        target_risk_level: str = 'Medium',
        n_recommendations: int = 5
    ) -> pd.DataFrame:
        """
        Get recommendations adjusted for risk preferences.
        
        Args:
            project_id: Source project ID (optional)
            target_risk_level: Desired risk level ('Low', 'Medium', 'High')
            n_recommendations: Number of recommendations to return
        
        Returns:
            DataFrame with risk-adjusted recommendations
        """
        # Start with all projects
        candidates = self.projects_df.copy()
        
        # Filter by risk level if available
        if 'risk_score' in candidates.columns:
            if target_risk_level == 'Low':
                candidates = candidates[candidates['risk_score'] < 40]
            elif target_risk_level == 'Medium':
                candidates = candidates[(candidates['risk_score'] >= 40) & (candidates['risk_score'] < 70)]
            elif target_risk_level == 'High':
                candidates = candidates[candidates['risk_score'] >= 70]
        
        # If project_id provided, find similar projects first
        if project_id is not None:
            similar = self.get_similar_projects(project_id, n_recommendations=n_recommendations*2)
            if not similar.empty:
                # Filter similar projects by risk level
                similar_ids = similar['project_id'].tolist()
                candidates = candidates[candidates['project_id'].isin(similar_ids)]
        
        # Sort by success rate (higher is better) and risk score (lower is better)
        if 'success_rate' in candidates.columns:
            candidates = candidates.sort_values('success_rate', ascending=False)
        elif 'risk_score' in candidates.columns:
            candidates = candidates.sort_values('risk_score', ascending=True)
        
        result = candidates.head(n_recommendations)
        
        # Add recommendation type
        result['recommendation_type'] = 'Risk-Adjusted'
        result['target_risk'] = target_risk_level
        
        logger.info(f"Found {len(result)} risk-adjusted recommendations")
        return result
    
    def get_project_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about the project portfolio.
        
        Returns:
            Dictionary with portfolio statistics
        """
        stats = {
            'total_projects': len(self.projects_df),
            'ministries': {},
            'project_types': {},
            'average_budget': 0,
            'average_risk_score': 0,
            'average_success_rate': 0,
            'status_distribution': {},
            'priority_distribution': {}
        }
        
        # Ministry distribution
        if 'ministry' in self.projects_df.columns:
            stats['ministries'] = self.projects_df['ministry'].value_counts().to_dict()
        
        # Project type distribution
        if 'project_type' in self.projects_df.columns:
            stats['project_types'] = self.projects_df['project_type'].value_counts().to_dict()
        
        # Status distribution
        if 'status' in self.projects_df.columns:
            stats['status_distribution'] = self.projects_df['status'].value_counts().to_dict()
        
        # Priority distribution
        if 'priority' in self.projects_df.columns:
            stats['priority_distribution'] = self.projects_df['priority'].value_counts().to_dict()
        
        # Averages
        if 'budget' in self.projects_df.columns:
            stats['average_budget'] = float(self.projects_df['budget'].mean())
        
        if 'risk_score' in self.projects_df.columns:
            stats['average_risk_score'] = float(self.projects_df['risk_score'].mean())
        
        if 'success_rate' in self.projects_df.columns:
            stats['average_success_rate'] = float(self.projects_df['success_rate'].mean())
        
        return stats
    
    def get_recommendation_explanation(
        self, 
        project_id: str, 
        recommendation_id: str
    ) -> Dict[str, Any]:
        """
        Generate an explanation for why a project was recommended.
        
        Args:
            project_id: Source project ID
            recommendation_id: Recommended project ID
        
        Returns:
            Dictionary with explanation details
        """
        # Get both projects
        source = self.get_project_by_id(project_id)
        recommended = self.get_project_by_id(recommendation_id)
        
        if source is None or recommended is None:
            return {'error': 'One or both projects not found'}
        
        # Find similar features
        similar_features = []
        
        # Compare categorical features
        for col in self.categorical_features:
            if col in source and col in recommended:
                if source[col] == recommended[col]:
                    similar_features.append({
                        'feature': col,
                        'value': source[col],
                        'match_type': 'exact'
                    })
        
        # Compare numerical features (within 20% range)
        for col in self.numerical_features:
            if col in source and col in recommended and isinstance(source[col], (int, float)):
                if source[col] > 0:
                    diff_percent = abs(source[col] - recommended[col]) / source[col]
                    if diff_percent < 0.2:
                        similar_features.append({
                            'feature': col,
                            'value': f"{source[col]:.2f} → {recommended[col]:.2f}",
                            'match_type': 'close'
                        })
        
        # Get similarity score
        similarity = self.similarity_matrix[
            self.projects_df[self.projects_df['project_id'] == project_id].index[0],
            self.projects_df[self.projects_df['project_id'] == recommendation_id].index[0]
        ] if project_id in self.projects_df['project_id'].values and recommendation_id in self.projects_df['project_id'].values else 0
        
        return {
            'source_project': source.get('project_name', 'Unknown'),
            'recommended_project': recommended.get('project_name', 'Unknown'),
            'similarity_score': float(similarity),
            'similarity_percentage': float(similarity * 100),
            'similar_features': similar_features[:5],
            'total_features_matched': len(similar_features),
            'recommendation_strength': 'Strong' if similarity > 0.6 else 'Moderate' if similarity > 0.3 else 'Weak'
        }
    
    def export_recommendations(
        self, 
        recommendations: pd.DataFrame, 
        format: str = 'json'
    ) -> Union[str, Dict]:
        """
        Export recommendations in specified format.
        
        Args:
            recommendations: DataFrame of recommendations
            format: Output format ('json', 'csv')
        
        Returns:
            Formatted recommendations
        """
        if recommendations.empty:
            return {'error': 'No recommendations to export'}
        
        if format == 'json':
            # Convert to JSON with proper formatting
            result = {
                'timestamp': datetime.now().isoformat(),
                'total_recommendations': len(recommendations),
                'recommendations': recommendations.to_dict('records')
            }
            return result
        elif format == 'csv':
            return recommendations.to_csv(index=False)
        else:
            raise ValueError(f"Unsupported format: {format}")


def create_recommendation_from_project(project_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a recommendation from a project dictionary.
    
    Args:
        project_data: Dictionary containing project details
    
    Returns:
        Formatted recommendation
    """
    return {
        'project_name': project_data.get('project_name', 'Unnamed Project'),
        'project_type': project_data.get('project_type', 'Unknown'),
        'ministry': project_data.get('ministry', 'Unknown'),
        'budget': project_data.get('planned_budget_mad', 0),
        'duration': project_data.get('planned_duration_days', 0),
        'risk_level': project_data.get('risk_level', 'Medium'),
        'recommendation_score': project_data.get('similarity_score', 0),
        'match_reasons': project_data.get('match_reasons', [])
    }


def main():
    """Demonstrate recommendation engine functionality."""
    print("=" * 70)
    print("PROJECT RECOMMENDATION ENGINE")
    print("Ministry of Digital Transition and Administration Reform - Morocco")
    print("=" * 70)
    
    try:
        # Initialize engine
        engine = RecommendationEngine(model_dir='models', use_risk_model=True)
        
        # Get statistics
        print("\n1. PORTFOLIO STATISTICS")
        print("-" * 50)
        stats = engine.get_project_statistics()
        print(f"Total Projects: {stats['total_projects']}")
        print(f"Average Budget: {stats['average_budget']:,.2f} MAD")
        print(f"Average Risk Score: {stats['average_risk_score']:.1f}/100")
        print(f"Average Success Rate: {stats['average_success_rate']:.1%}")
        
        if stats['ministries']:
            print("\nTop Ministries:")
            for ministry, count in list(stats['ministries'].items())[:5]:
                print(f"  - {ministry}: {count} projects")
        
        # Similar projects demo
        print("\n2. SIMILAR PROJECTS RECOMMENDATIONS")
        print("-" * 50)
        
        if 'project_id' in engine.projects_df.columns and len(engine.projects_df) > 0:
            first_project_id = engine.projects_df['project_id'].iloc[0]
            first_project_name = engine.projects_df['project_name'].iloc[0]
            
            print(f"Source Project: {first_project_name} ({first_project_id})")
            similar = engine.get_similar_projects(first_project_id, n_recommendations=3)
            
            if not similar.empty:
                print("\nTop 3 Similar Projects:")
                for idx, row in similar.iterrows():
                    print(f"  - {row['project_name']}")
                    print(f"    Similarity: {row['similarity_percentage']:.1f}%")
                    print(f"    Ministry: {row.get('ministry', 'Unknown')}")
                    print(f"    Budget: {row.get('budget', 0):,.2f} MAD")
                    print()
            else:
                print("No similar projects found")
        
        # Criteria-based recommendations
        print("\n3. CRITERIA-BASED RECOMMENDATIONS")
        print("-" * 50)
        
        criteria = {
            'ministry': 'Health',
            'min_budget': 1000000,
            'max_budget': 10000000,
            'priority': 'High'
        }
        print(f"Criteria: {criteria}")
        
        recommendations = engine.get_recommendations_by_criteria(criteria, n_recommendations=3)
        
        if not recommendations.empty:
            print("\nTop 3 Projects Matching Criteria:")
            for idx, row in recommendations.iterrows():
                print(f"  - {row.get('project_name', 'Unknown')}")
                print(f"    Match Score: {row.get('match_score', 0):.0f}%")
                print(f"    Budget: {row.get('budget', 0):,.2f} MAD")
                print(f"    Priority: {row.get('priority', 'Unknown')}")
                print()
        else:
            print("No projects found matching the criteria")
        
        # Risk-adjusted recommendations
        print("\n4. RISK-ADJUSTED RECOMMENDATIONS")
        print("-" * 50)
        
        for risk_level in ['Low', 'Medium', 'High']:
            print(f"\nTarget Risk Level: {risk_level}")
            risk_recs = engine.get_risk_adjusted_recommendations(
                target_risk_level=risk_level,
                n_recommendations=2
            )
            
            if not risk_recs.empty:
                print(f"  Found {len(risk_recs)} projects:")
                for idx, row in risk_recs.iterrows():
                    print(f"    - {row.get('project_name', 'Unknown')}")
                    if 'risk_score' in row:
                        print(f"      Risk Score: {row['risk_score']:.1f}")
                    if 'success_rate' in row:
                        print(f"      Success Rate: {row['success_rate']:.1%}")
            else:
                print(f"  No projects found with {risk_level} risk level")
        
        # Recommendation explanation
        print("\n5. RECOMMENDATION EXPLANATION")
        print("-" * 50)
        
        if len(engine.projects_df) >= 2:
            project1 = engine.projects_df['project_id'].iloc[0]
            project2 = engine.projects_df['project_id'].iloc[1]
            
            explanation = engine.get_recommendation_explanation(project1, project2)
            
            if 'error' not in explanation:
                print(f"Source: {explanation['source_project']}")
                print(f"Recommended: {explanation['recommended_project']}")
                print(f"Similarity: {explanation['similarity_percentage']:.1f}%")
                print(f"Strength: {explanation['recommendation_strength']}")
                print(f"Features Matched: {explanation['total_features_matched']}")
                
                if explanation['similar_features']:
                    print("\nMatching Features:")
                    for feature in explanation['similar_features'][:3]:
                        print(f"  - {feature['feature']}: {feature['value']} ({feature['match_type']})")
            else:
                print(f"Error: {explanation['error']}")
        
        print("\n" + "=" * 70)
        print("Recommendation engine demonstration completed successfully!")
        print("=" * 70)
        
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
