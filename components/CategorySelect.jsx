import React from 'react';
import './CategorySelect.css';

const categories = [
    { id: 'love', name: '연애운', icon: '♥️', description: '사랑과 인연에 대한 운세' },
    { id: 'job', name: '취업운', icon: '💼', description: '취업과 진로에 대한 운세' },
    { id: 'business', name: '사업운', icon: '🏢', description: '사업과 투자에 대한 운세' },
    { id: 'money', name: '금전운', icon: '💰', description: '재물과 금전에 대한 운세' },
    { id: 'study', name: '학업운', icon: '📖', description: '학업과 시험에 대한 운세' }
];

const CategorySelect = ({ onSelect }) => {
    return (
        <div className="category-screen">
            <div className="category-header">
                <h2 className="category-title">어떤 운세를 보시겠어요?</h2>
                <p className="category-subtitle">궁금한 분야를 선택해주세요</p>
            </div>

            <div className="category-grid">
                {categories.map((category) => (
                    <button
                        key={category.id}
                        className="category-card"
                        onClick={() => onSelect(category)}
                    >
                        <span className="category-icon">{category.icon}</span>
                        <span className="category-name">{category.name}</span>
                        <span className="category-desc">{category.description}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default CategorySelect;
