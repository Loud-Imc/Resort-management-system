import React from 'react';

interface HeroTextProps {
    heading: string;
    className?: string;
}

const HeroText: React.FC<HeroTextProps> = ({ heading, className }) => {
    return (
        <div className={`${className}`}>
            <h1
                className="text-4xl md:text-6xl lg:text-6xl font-semibold tracking-normal animate-fade-in leading-tight"
                style={{ fontFamily: "'Caveat', cursive" }}
            >
                {heading}
            </h1>
        </div>
    );
};

export default HeroText;
