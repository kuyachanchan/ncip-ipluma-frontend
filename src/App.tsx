import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import BatchPdfSigner from "./BatchPdfSigner";
import AuditLogViewer from "./AuditLogViewer";
import SignatureManagement from "./pages/SignatureManagement";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import CertificateManagement from "./pages/CertificateManagement";
import UserAccountManagement from "./pages/UserAccountManagement";
import UploadManager from "./pages/UploadManager";
import Pluma from "./pages/Pluma";
import AboutUs from "./pages/AboutUs"
import UserPdfVerifierv2 from "./user/UserPdfVerifierv2";
import UserPdfSigner from "./user/UserPdfSigner";
import { Toaster } from "react-hot-toast";
import OfficeManagement from "./pages/OfficeManagement";
import MyDocument from "./pages/MyDocument";
import Shared from "./pages/Shared";

import { AuthProvider } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { RequireRole } from "./auth/RequireRole";
import { SettingsProvider } from "./settings/SettingsProvider";
import { ThemeProvider } from "./theme/ThemeProvider";
import type { ReactNode } from "react";
import SignedDocManagement from "./pages/SignedDocManagement";
import Notifications from "./pages/Notifications";
import Dashboard from "./pages/Dashboard";
import ApiPage from "./pages/ApiPage";
import MyProfiles from "./pages/MyProfiles";
import Setup from "./pages/Setup";
import { RequireSetup } from "./auth/RequireSetup";
import AboutDeveloper from "./pages/AboutDeveloper";
import { UsersGuide } from "./pages/UsersGuide";
import SignExternal from "./pages/SignExternal";
import Signing from "./pages/Signing";
import UsersAdmin from "./pages/UsersAdmin";
import VerificationPortal from "./pages/VerificationPortal";

import {
  initializeFaro,
  getWebInstrumentations,
  ReactIntegration,
  createReactRouterV6Options,
  FaroRoutes
} from '@grafana/faro-react'
import { TracingInstrumentation } from '@grafana/faro-web-tracing';
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router-dom';

import { FaroErrorBoundary } from '@grafana/faro-react';
import { Upload } from "./pages/Upload";



initializeFaro({
  url: import.meta.env.FARO_API_URL,
  app: {
    name: 'IPluma',
    version: '1.0.0',
    environment: 'production',
  },
  instrumentations: [
    ...getWebInstrumentations(),
    new TracingInstrumentation(),
    new ReactIntegration({
      router: createReactRouterV6Options({
        createRoutesFromChildren,
        matchRoutes,
        useLocation,
        useNavigationType,
        Routes,
      }),
    }),
  ],
})


interface AppProviderProps {
  children: ReactNode
}

const AppProviders = ({ children }: AppProviderProps) => (
  <AuthProvider>
    <ThemeProvider>
      <SettingsProvider>{children}</SettingsProvider>
    </ThemeProvider>
  </AuthProvider>
);



function App() {

  return (
    <Router basename="/">
      <AppProviders>
        <FaroErrorBoundary>
          <FaroRoutes>

            {/* Public Routes */}
            <Route path="/" element={<Pluma />} />
            <Route path="/login" element={<Login />} />
            <Route path="/public-about-us" element={<AboutUs />} />
            <Route path="/developer" element={<AboutDeveloper />} />
            <Route path="/sign-external" element={<SignExternal />} />
            <Route path="/verification-portal" element={<VerificationPortal />} />

            {/* ---------------- Protected Routes ---------------- */}

            <Route
              path="/sign"
              element={
                <RequireAuth>
                  <Signing />
                </RequireAuth>
              }
            />

            <Route
              path="/verify"
              element={
                <RequireAuth>
                  <Layout>
                    <UserPdfVerifierv2 />
                  </Layout>
                </RequireAuth>
              }
            />

            <Route
              path="/batch-sign"
              element={
                <RequireAuth>
                  <Layout>
                    <BatchPdfSigner />
                  </Layout>
                </RequireAuth>
              }
            />

            <Route
              path="/audit-logs"
              element={
                <RequireAuth>
                  <Layout>
                    <AuditLogViewer />
                  </Layout>
                </RequireAuth>
              }
            />

            <Route
              path="/documents/signed"
              element={
                <RequireAuth>
                  <Layout>
                    <SignedDocManagement />
                  </Layout>
                </RequireAuth>
              }
            />

            <Route
              path="/signatures"
              element={
                <RequireAuth>
                  <RequireSetup>
                    <Layout>
                      <SignatureManagement />
                    </Layout>
                  </RequireSetup>
                </RequireAuth>
              }
            />

            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </RequireAuth>
              }
            />

            <Route
              path="/certificates"
              element={
                <RequireAuth>
                  <RequireSetup>
                    <Layout>
                      <CertificateManagement />
                    </Layout>
                  </RequireSetup>
                </RequireAuth>
              }
            />

            <Route
              path="/uploadv2"
              element={
                <RequireAuth>
                  <RequireSetup>
                    <Layout>
                      <Upload />
                    </Layout>
                  </RequireSetup>
                </RequireAuth>
              }
            />

            <Route
              path="/users-guide"
              element={
                <RequireAuth>
                  <RequireSetup>
                    <UsersGuide />
                  </RequireSetup>
                </RequireAuth>
              }
            />

            {/* Admin-only routes example */}
            <Route
              path="/users"
              element={
                <RequireAuth>
                  <RequireRole role="ROLE_SUPERADMIN">
                    <Layout>
                      <UserAccountManagement />
                    </Layout>
                  </RequireRole>
                </RequireAuth>
              }
            />

            <Route
              path="/users-admin"
              element={
                <RequireAuth>
                  <RequireRole role="ROLE_ADMIN">
                    <Layout>
                      <UsersAdmin />
                    </Layout>
                  </RequireRole>
                </RequireAuth>
              }
            />


            <Route
              path="/users"
              element={
                <RequireAuth>
                  <RequireRole role="ROLE_SUPERADMIN">
                    <Layout>
                      <UserAccountManagement />
                    </Layout>
                  </RequireRole>
                </RequireAuth>
              }
            />


            <Route
              path="/offices"
              element={
                <RequireAuth>
                  <RequireRole role="ROLE_SUPERADMIN">
                    <Layout>
                      <OfficeManagement />
                    </Layout>
                  </RequireRole>
                </RequireAuth>
              }
            />

            {/* Normal authenticated routes */}
            <Route
              path="/documents/my-documentss"
              element={
                <RequireAuth>
                  <Layout>
                    <MyDocument />
                  </Layout>
                </RequireAuth>
              }
            />

            <Route
              path="/my-profile"
              element={
                <RequireAuth>
                  <RequireSetup>
                    <Layout>
                      <MyProfiles />
                    </Layout>
                  </RequireSetup>
                </RequireAuth>
              }
            />

            <Route
              path="my-documents"
              element={
                <RequireAuth>
                  <RequireSetup>
                    <Layout>
                      <UploadManager />
                    </Layout>
                  </RequireSetup>
                </RequireAuth>
              }
            />

            <Route
              path="/notifications"
              element={
                <RequireAuth>
                  <RequireSetup>
                    <Layout>
                      <Notifications />
                    </Layout>
                  </RequireSetup>
                </RequireAuth>
              }
            />

            <Route
              path="/shared"
              element={
                <RequireAuth>
                  <RequireSetup>
                    <Layout>
                      <Shared />
                    </Layout>
                  </RequireSetup>
                </RequireAuth>
              }
            />

            <Route
              path="/setup"
              element={
                <RequireAuth>
                  <Setup />
                </RequireAuth>
              }
            />

            <Route
              path="/connect"
              element={
                <RequireAuth>
                  <Layout>
                    <ApiPage />
                  </Layout>
                </RequireAuth>
              }
            />

            <Route
              path="my-documents/sign/:id"
              element={
                <RequireAuth>
                  <Layout>
                    <UserPdfSigner />
                  </Layout>
                </RequireAuth>
              }
            />

            {/* 404 */}
            <Route
              path="*"
              element={
                <div className="flex items-center justify-center min-h-screen bg-[#E7F2EF]">
                  <div className="text-center">
                    <h2 className="text-4xl font-bold text-[#19183B] mb-2">404</h2>
                    <p className="text-[#708993] mb-4">Page Not Found</p>
                    <a
                      href="/login"
                      className="text-[#19183B] hover:text-[#708993] font-medium underline"
                    >
                      Return to Login
                    </a>
                  </div>
                </div>
              }
            />

          </FaroRoutes>
        </FaroErrorBoundary>
        <Toaster position="top-right" reverseOrder={false} />
      </AppProviders>
    </Router>
  );
}

export default App;
