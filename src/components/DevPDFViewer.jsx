import React, { useState } from 'react';
import { PDFViewer, Page, Text, View, Document } from '@react-pdf/renderer';
import { ServiceReportFixed } from './ServiceReportFixed';
import { MaintenanceReportPDF } from './MaintenanceReportPDF';
import { JobSheetPDF } from '../apps/quoting/components/JobSheetPDF';
import { generateSampleSite } from '../data/mockData';

// Generate reuseable mock data
const mockSite = generateSampleSite();
mockSite.logo = null; // Disable logo for dev viewer to prevent Image crash



const mockQuote = {
    id: 'Q-1001',
    // customerName: mockSite.customer, // Moved to jobDetails
    // siteName: mockSite.location,     // Moved to jobDetails
    jobDetails: {
        jobNo: 'Q-1001',
        customer: mockSite.customer,
        location: mockSite.location,
        jobDescription: 'Standard Technician Job Sheet Test',
        // technicians: ['Technician A', 'Technician B'], // Not used in top grid? Checked: Not usage in top grid.
        description: 'Scope of works description here...', // Mapped to description in component
        techNotes: 'Safety glasses required.',
        date: new Date().toISOString(),
    },
    shifts: [
        {
            date: new Date().toISOString(),
            startTime: '08:00',
            finishTime: '16:00', // Component expects finishTime, not endTime
            tech: 'Technician A', // Component expects tech, not technicians array
            dayType: 'weekday',
            isNightShift: false,
            vehicle: true
        }
    ]
};


const DevPDFViewer = () => {
    const [selectedReport, setSelectedReport] = useState('job-sheet');
    const [debugMode, setDebugMode] = useState(false);

    const reportOptions = [
        { id: 'job-sheet', label: 'Technician Job Sheet (Working)' },
        { id: 'service-report', label: 'Service Report (Placeholder)' },
        { id: 'maintenance-report', label: 'Maintenance Report (Placeholder)' }
    ];

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#1a1a1a' }}>
            {/* Control Bar */}
            <div style={{ padding: '10px 20px', backgroundColor: '#2d2d2d', borderBottom: '1px solid #404040', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <h2 style={{ color: 'white', margin: 0, fontSize: '16px', fontWeight: 'bold' }}>📄 PDF Dev Environment</h2>

                <select
                    value={selectedReport}
                    onChange={(e) => setSelectedReport(e.target.value)}
                    style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: 'white' }}
                >
                    {reportOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                </select>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc', fontSize: '14px', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={debugMode}
                        onChange={(e) => setDebugMode(e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    Debug Layout
                </label>

                <div style={{ display: 'flex', gap: '5px', marginLeft: 'auto', color: '#888', fontSize: '12px' }}>
                    <span>{mockSite.customer}</span>
                    <span>•</span>
                    <span>{mockSite.location}</span>
                </div>

                <a href="/" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '14px', marginLeft: '10px' }}>Exit to App</a>
            </div>

            {/* Viewer */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <PDFViewer width="100%" height="100%" showToolbar={true}>
                    {(() => {
                        // FORCE USE OF WORKING COMPONENT FOR ALL OPTIONS TO PREVENT CRASH
                        // This allows you to at least click the menus without RSOD
                        // We will fix the other templates later.
                        return <JobSheetPDF quote={mockQuote} debug={debugMode} />;
                    })()}
                </PDFViewer>
            </div>
        </div>
    );
};

export default DevPDFViewer;
