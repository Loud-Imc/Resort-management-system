import React from 'react';

interface HeroTextProps {
    heading: string;
    subheading?: string;
    className?: string;
}

const HeroText: React.FC<HeroTextProps> = ({ heading, subheading, className }) => {
    return (
        <div className={`${className} flex flex-col items-center justify-center text-center space-y-2`}>
            <h1
                className="text-3xl md:text-[2.5rem] lg:text-[2.75rem] font-normal tracking-tight text-gray-900 leading-tight"
                style={{ fontFamily: "'Manrope', sans-serif" }}
            >
                {heading.split(',').length > 1 ? (
                    <>
                        {heading.split(',')[0]}, <span className="text-primary-800">{heading.split(',').slice(1).join(',')}</span>
                    </>
                ) : (
                    heading
                )}
            </h1>
            {subheading && (
                <p className="text-xs md:text-sm text-gray-500 max-w-xl" style={{ fontFamily: "'PT Sans', sans-serif" }}>
                    {subheading.includes("Kerala") ? (
                        <>
                            {subheading.split("Kerala")[0]}
                            <span className="text-primary-800 font-semibold">Kerala</span>
                            {subheading.split("Kerala")[1]}
                        </>
                    ) : (
                        subheading
                    )}
                </p>
            )}
        </div>
    );
};

export default HeroText;
