import React, { useEffect, useState } from 'react';
import Banner from "../Components/Banner.jsx";
import FeaturedProperties from '../Components/FeaturedProperties.jsx';
import WhyChooseUs from '../Components/WhyChooseUs.jsx';
import HomePageStats from '../Components/HomePageStats.jsx';
import BeginYourPropertyJourney from '../Components/BeginYourPropertyJourney.jsx';
import FAQSection from '../Components/FAQSection.jsx';
import Loading from '../Components/Loading.jsx';

const HomePage = () => {
    const [initialLoading, setInitialLoading] = useState(true);

    // LAND AT TOP & FORCED INITIAL LOADING (0.25s)
    useEffect(() => {
        window.scrollTo(0, 0);
        const timer = setTimeout(() => {
            setInitialLoading(false);
        }, 250);
        return () => clearTimeout(timer);
    }, []);

    if (initialLoading) {
        return <Loading />;
    }

    return (
        <div className='min-h-screen'>
            <Banner></Banner>
            <HomePageStats></HomePageStats>
            <FeaturedProperties></FeaturedProperties>
            <WhyChooseUs></WhyChooseUs>
            <BeginYourPropertyJourney></BeginYourPropertyJourney>
            <FAQSection></FAQSection>
        </div>
    );
};

export default HomePage;
