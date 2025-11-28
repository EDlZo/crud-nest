import React from 'react';
import { FaCalendar, FaDollarSign, FaClipboardList, FaComments } from 'react-icons/fa';

const DashboardPage = () => {
    return (
        <div className="container-fluid">
            {/* Page Heading */}
            <div className="d-sm-flex align-items-center justify-content-between mb-4">
                <h1 className="h3 mb-0 text-gray-800">Dashboard</h1>
                <a href="#" className="d-none d-sm-inline-block btn btn-sm btn-primary shadow-sm">
                    <i className="fas fa-download fa-sm text-white-50"></i> Generate Report
                </a>
            </div>

            {/* Content Row */}
            <div className="row">

                {/* Earnings (Monthly) Card Example */}
                <div className="col-xl-3 col-md-6 mb-4">
                    <div className="card border-left-primary shadow h-100 py-2">
                        <div className="card-body">
                            <div className="row no-gutters align-items-center">
                                <div className="col mr-2">
                                    <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                        Earnings (Monthly)</div>
                                    <div className="h5 mb-0 font-weight-bold text-gray-800">$40,000</div>
                                </div>
                                <div className="col-auto">
                                    <FaCalendar className="fa-2x text-gray-300" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Earnings (Annual) Card Example */}
                <div className="col-xl-3 col-md-6 mb-4">
                    <div className="card border-left-success shadow h-100 py-2">
                        <div className="card-body">
                            <div className="row no-gutters align-items-center">
                                <div className="col mr-2">
                                    <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                                        Earnings (Annual)</div>
                                    <div className="h5 mb-0 font-weight-bold text-gray-800">$215,000</div>
                                </div>
                                <div className="col-auto">
                                    <FaDollarSign className="fa-2x text-gray-300" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tasks Card Example */}
                <div className="col-xl-3 col-md-6 mb-4">
                    <div className="card border-left-info shadow h-100 py-2">
                        <div className="card-body">
                            <div className="row no-gutters align-items-center">
                                <div className="col mr-2">
                                    <div className="text-xs font-weight-bold text-info text-uppercase mb-1">Tasks
                                    </div>
                                    <div className="row no-gutters align-items-center">
                                        <div className="col-auto">
                                            <div className="h5 mb-0 mr-3 font-weight-bold text-gray-800">50%</div>
                                        </div>
                                        <div className="col">
                                            <div className="progress progress-sm mr-2">
                                                <div className="progress-bar bg-info" role="progressbar"
                                                    style={{ width: '50%' }} aria-valuenow={50} aria-valuemin={0}
                                                    aria-valuemax={100}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-auto">
                                    <FaClipboardList className="fa-2x text-gray-300" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pending Requests Card Example */}
                <div className="col-xl-3 col-md-6 mb-4">
                    <div className="card border-left-warning shadow h-100 py-2">
                        <div className="card-body">
                            <div className="row no-gutters align-items-center">
                                <div className="col mr-2">
                                    <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                                        Pending Requests</div>
                                    <div className="h5 mb-0 font-weight-bold text-gray-800">18</div>
                                </div>
                                <div className="col-auto">
                                    <FaComments className="fa-2x text-gray-300" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Row */}
            <div className="row">
                <div className="col-lg-6 mb-4">
                    <div className="card shadow mb-4">
                        <div className="card-header py-3">
                            <h6 className="m-0 font-weight-bold text-primary">Projects</h6>
                        </div>
                        <div className="card-body">
                            <h4 className="small font-weight-bold">Server Migration <span
                                className="float-right">20%</span></h4>
                            <div className="progress mb-4">
                                <div className="progress-bar bg-danger" role="progressbar" style={{ width: '20%' }}
                                    aria-valuenow={20} aria-valuemin={0} aria-valuemax={100}></div>
                            </div>
                            <h4 className="small font-weight-bold">Sales Tracking <span
                                className="float-right">40%</span></h4>
                            <div className="progress mb-4">
                                <div className="progress-bar bg-warning" role="progressbar" style={{ width: '40%' }}
                                    aria-valuenow={40} aria-valuemin={0} aria-valuemax={100}></div>
                            </div>
                            <h4 className="small font-weight-bold">Customer Database <span
                                className="float-right">60%</span></h4>
                            <div className="progress mb-4">
                                <div className="progress-bar" role="progressbar" style={{ width: '60%' }}
                                    aria-valuenow={60} aria-valuemin={0} aria-valuemax={100}></div>
                            </div>
                            <h4 className="small font-weight-bold">Payout Details <span
                                className="float-right">80%</span></h4>
                            <div className="progress mb-4">
                                <div className="progress-bar bg-info" role="progressbar" style={{ width: '80%' }}
                                    aria-valuenow={80} aria-valuemin={0} aria-valuemax={100}></div>
                            </div>
                            <h4 className="small font-weight-bold">Account Setup <span
                                className="float-right">Complete!</span></h4>
                            <div className="progress mb-4">
                                <div className="progress-bar bg-success" role="progressbar" style={{ width: '100%' }}
                                    aria-valuenow={100} aria-valuemin={0} aria-valuemax={100}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-6 mb-4">
                    <div className="card shadow mb-4">
                        <div className="card-header py-3">
                            <h6 className="m-0 font-weight-bold text-primary">Illustrations</h6>
                        </div>
                        <div className="card-body">
                            <div className="text-center">
                                <img className="img-fluid px-3 px-sm-4 mt-3 mb-4" style={{ width: '25rem' }}
                                    src="img/undraw_posting_photo.svg" alt="..." />
                            </div>
                            <p>Add some quality, svg illustrations to your project courtesy of <a
                                target="_blank" rel="nofollow" href="https://undraw.co/">unDraw</a>, a
                                constantly updated collection of beautiful svg images that you can use
                                completely free and without attribution!</p>
                            <a target="_blank" rel="nofollow" href="https://undraw.co/">Browse Illustrations on
                                unDraw &rarr;</a>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default DashboardPage;
