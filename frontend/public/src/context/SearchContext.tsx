import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addDays } from 'date-fns';

interface SearchContextType {
    location: string;
    setLocation: (v: string) => void;
    categoryId: string;
    setCategoryId: (v: string) => void;
    checkIn: Date | null;
    setCheckIn: (v: Date | null) => void;
    checkOut: Date | null;
    setCheckOut: (v: Date | null) => void;
    adults: number;
    setAdults: (v: number) => void;
    children: number;
    setChildren: (v: number) => void;
    rooms: number;
    setRooms: (v: number) => void;
    isGroupBooking: boolean;
    setIsGroupBooking: (v: boolean) => void;
    groupSize: number;
    setGroupSize: (v: number) => void;
    latitude: number | null;
    setLatitude: (v: number | null) => void;
    longitude: number | null;
    setLongitude: (v: number | null) => void;
    radius: number;
    setRadius: (v: number) => void;
    syncFromUrl: () => void;
    clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [searchParams] = useSearchParams();

    const [location, setLocation] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [checkIn, setCheckIn] = useState<Date | null>(new Date());
    const [checkOut, setCheckOut] = useState<Date | null>(addDays(new Date(), 1));
    const [adults, setAdults] = useState(2);
    const [childrenCount, setChildrenCount] = useState(0);
    const [rooms, setRooms] = useState(1);
    const [isGroupBooking, setIsGroupBooking] = useState(false);
    const [groupSize, setGroupSize] = useState(10);
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [radius, setRadius] = useState(50);

    const syncFromUrl = useCallback(() => {
        const loc = searchParams.get('location');
        const cat = searchParams.get('category');
        const cin = searchParams.get('checkIn');
        const cout = searchParams.get('checkOut');
        const adl = searchParams.get('adults');
        const chi = searchParams.get('children');
        const rms = searchParams.get('rooms');
        const isGrp = searchParams.get('isGroupBooking') === 'true';
        const grpSz = searchParams.get('groupSize');
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');
        const rad = searchParams.get('radius');

        if (loc) setLocation(loc);
        if (cat) setCategoryId(cat);
        if (cin && cin !== 'null') {
            const date = new Date(cin);
            if (!isNaN(date.getTime())) setCheckIn(date);
        }
        if (cout && cout !== 'null') {
            const date = new Date(cout);
            if (!isNaN(date.getTime())) setCheckOut(date);
        }
        if (adl) setAdults(parseInt(adl) || 2);
        if (chi) setChildrenCount(parseInt(chi) || 0);
        if (rms) setRooms(parseInt(rms) || 1);
        setIsGroupBooking(isGrp);
        if (grpSz) setGroupSize(parseInt(grpSz) || 10);
        if (lat && lat !== 'null') setLatitude(parseFloat(lat));
        if (lng && lng !== 'null') setLongitude(parseFloat(lng));
        if (rad) setRadius(parseInt(rad) || 50);
    }, [searchParams]);

    const clearSearch = useCallback(() => {
        setLocation('');
        setCategoryId('');
        setCheckIn(null);
        setCheckOut(null);
        setAdults(2);
        setChildrenCount(0);
        setRooms(1);
        setIsGroupBooking(false);
        setGroupSize(10);
        setLatitude(null);
        setLongitude(null);
        setRadius(50);
    }, []);

    // Initial sync from URL parameters
    useEffect(() => {
        syncFromUrl();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value = {
        location, setLocation,
        categoryId, setCategoryId,
        checkIn, setCheckIn,
        checkOut, setCheckOut,
        adults, setAdults,
        children: childrenCount,
        setChildren: setChildrenCount,
        rooms, setRooms,
        isGroupBooking, setIsGroupBooking,
        groupSize, setGroupSize,
        latitude, setLatitude,
        longitude, setLongitude,
        radius, setRadius,
        syncFromUrl,
        clearSearch
    };

    return (
        <SearchContext.Provider value={value}>
            {children}
        </SearchContext.Provider>
    );
};

export const useSearch = () => {
    const context = useContext(SearchContext);
    if (!context) throw new Error('useSearch must be used within a SearchProvider');
    return context;
};
