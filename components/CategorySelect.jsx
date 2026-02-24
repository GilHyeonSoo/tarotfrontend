import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './CategorySelect.css';

const CategorySelect = ({ onSelect }) => {
    const { t } = useLanguage();

    const categories = [
        { id: 'love', icon: '♥️' },
        { id: 'job', icon: '💼' },
        { id: 'business', icon: '🏢' },
        { id: 'money', icon: '💰' },
        { id: 'study', icon: '📖' }
    ];

    return (
        <section className="category-screen" aria-label="Category Select">
            <header className="category-header">
                <h2 className="category-title">{t('category.title')}</h2>
                <p className="category-subtitle">{t('category.subtitle')}</p>
            </header>

            <nav className="category-grid" aria-label="Fortune categories">
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        className="category-card"
                        onClick={() => onSelect({ ...cat, name: t(`category.${cat.id}`), description: t(`category.${cat.id}Desc`) })}
                        aria-label={`${t(`category.${cat.id}`)} - ${t(`category.${cat.id}Desc`)}`}
                    >
                        <span className="category-icon" aria-hidden="true">{cat.icon}</span>
                        <span className="category-name">{t(`category.${cat.id}`)}</span>
                        <span className="category-desc">{t(`category.${cat.id}Desc`)}</span>
                    </button>
                ))}
            </nav>
        </section>
    );
};

export default CategorySelect;
