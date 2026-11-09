import { useState, useEffect, useCallback } from 'react'
import ResumeScreening from './components/ResumeScreening'

import {
  LayoutDashboard,
  FileText,
  Users,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  LogOut,
  Search,
  Upload,
  BrainCircuit,
  ChevronRight,
  Menu,
  Sparkles,
  LockKeyhole,
  Mail,
  User,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  UserCheck,
  ClipboardList
} from 'lucide-react'

const API_URL = 'http://127.0.0.1:8000'

const recruiterNavigation = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Resume Screening', icon: FileText },
  { name: 'Candidates', icon: Users },
  { name: 'Job Management', icon: BriefcaseBusiness },
  { name: 'Reports & Analytics', icon: ChartNoAxesCombined }
]

const clientNavigation = [
  { name: 'Client Dashboard', icon: LayoutDashboard },
  { name: 'My Shortlist', icon: ClipboardList }
]

function App() {
  const [token, setToken] = useState(
    sessionStorage.getItem('access_token') || ''
  )

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })

  const [authMode, setAuthMode] = useState('login')
  const [activePage, setActivePage] = useState('Dashboard')
  const [mobileMenu, setMobileMenu] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [candidates, setCandidates] = useState([])
  const [clients, setClients] = useState([])
  const [shortlist, setShortlist] = useState([])

  const [pageLoading, setPageLoading] = useState(false)
  const [pageError, setPageError] = useState('')
  const [success, setSuccess] = useState('')
  const [clientSelections, setClientSelections] = useState({})
  const [searchTerm, setSearchTerm] = useState('')

  const isClient = user?.role === 'client'
  const navigation = isClient ? clientNavigation : recruiterNavigation

  // ==================================================
  // API HELPER
  // ==================================================

  const apiRequest = useCallback(async (endpoint, options = {}) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.detail || 'Something went wrong.')
    }

    return data
  }, [token])

  // ==================================================
  // LOGIN
  // ==================================================

  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed.')
      }

      sessionStorage.setItem('access_token', data.access_token)
      sessionStorage.setItem('user', JSON.stringify(data.user))

      setToken(data.access_token)
      setUser(data.user)
      setActivePage(
        data.user.role === 'client' ? 'Client Dashboard' : 'Dashboard'
      )
      setPassword('')

    } catch (err) {
      setError(err.message || 'Unable to connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  // ==================================================
  // REGISTRATION
  // ==================================================

  const handleRegister = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role: 'recruiter'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed.')
      }

      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const loginData = await loginResponse.json()

      if (!loginResponse.ok) {
        throw new Error('Registration successful. Please sign in.')
      }

      sessionStorage.setItem('access_token', loginData.access_token)
      sessionStorage.setItem('user', JSON.stringify(loginData.user))

      setToken(loginData.access_token)
      setUser(loginData.user)
      setActivePage('Dashboard')
      setPassword('')

    } catch (err) {
      setError(err.message || 'Unable to connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  // ==================================================
  // LOGOUT
  // ==================================================

  const handleLogout = () => {
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('user')

    setToken('')
    setUser(null)
    setActivePage('Dashboard')
    setEmail('')
    setPassword('')
    setName('')
    setError('')
    setCandidates([])
    setClients([])
    setShortlist([])
  }

  // ==================================================
  // LOAD RECRUITER DATA
  // ==================================================

  const loadRecruiterData = useCallback(async () => {
    setPageLoading(true)
    setPageError('')

    try {
      const [candidateData, clientData] = await Promise.all([
        apiRequest('/api/recruiter/candidates'),
        apiRequest('/api/recruiter/clients')
      ])

      setCandidates(candidateData.candidates || [])
      setClients(clientData.clients || [])

    } catch (err) {
      setPageError(err.message)
    } finally {
      setPageLoading(false)
    }
  }, [apiRequest])

  // ==================================================
  // LOAD CLIENT SHORTLIST
  // ==================================================

  const loadClientShortlist = useCallback(async () => {
    setPageLoading(true)
    setPageError('')

    try {
      const data = await apiRequest('/api/client/shortlist')
      setShortlist(data.candidates || [])

    } catch (err) {
      setPageError(err.message)
    } finally {
      setPageLoading(false)
    }
  }, [apiRequest])

  // ==================================================
  // LOAD DATA ON PAGE CHANGE
  // ==================================================

  useEffect(() => {
    if (!token || !user) return

    if (user.role === 'recruiter') {
      loadRecruiterData()
    }

    if (user.role === 'client') {
      loadClientShortlist()
    }
  }, [
    token,
    user,
    activePage,
    loadRecruiterData,
    loadClientShortlist
  ])

  // ==================================================
  // SHORTLIST CANDIDATE
  // ==================================================

  const handleShortlist = async (screeningResultId) => {
    const clientId = clientSelections[screeningResultId]

    if (!clientId) {
      setPageError('Please select a client first.')
      return
    }

    setPageError('')
    setSuccess('')

    try {
      await apiRequest(
        `/api/recruiter/candidates/${screeningResultId}/shortlist`,
        {
          method: 'POST',
          body: JSON.stringify({
            client_id: Number(clientId),
            notes: 'Candidate shared for client evaluation.'
          })
        }
      )

      setSuccess('Candidate shared with client successfully.')
      await loadRecruiterData()

    } catch (err) {
      setPageError(err.message)
    }
  }

  // ==================================================
  // UPDATE CLIENT STATUS
  // ==================================================

  const handleStatusUpdate = async (shortlistId, status) => {
    setPageError('')
    setSuccess('')

    try {
      await apiRequest(
        `/api/client/shortlist/${shortlistId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status,
            notes: `Client updated candidate status to ${status}.`
          })
        }
      )

      setSuccess('Candidate status updated successfully.')
      await loadClientShortlist()

    } catch (err) {
      setPageError(err.message)
    }
  }

  // ==================================================
  // AUTHENTICATION SCREEN
  // ==================================================

  if (!token || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-md">

          <div className="mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg">
              <BrainCircuit size={34} />
            </div>

            <h1 className="mt-4 text-3xl font-bold text-slate-900">
              HireSense<span className="text-violet-600"> AI</span>
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Smart Recruitment Platform
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">

            <h2 className="text-2xl font-bold text-slate-900">
              {authMode === 'login'
                ? 'Welcome back!'
                : 'Create your account'}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {authMode === 'login'
                ? 'Sign in to access your workspace.'
                : 'Register as a recruiter to get started.'}
            </p>

            <form
              onSubmit={authMode === 'login' ? handleLogin : handleRegister}
              className="mt-7 space-y-5"
            >

              {authMode === 'register' && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Full Name
                  </label>

                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-4">
                    <User size={18} className="text-slate-400" />

                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full py-3 text-sm outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email Address
                </label>

                <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-4">
                  <Mail size={18} className="text-slate-400" />

                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full py-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>

                <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-4">
                  <LockKeyhole size={18} className="text-slate-400" />

                  <input
                    required
                    type="password"
                    minLength={8}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full py-3 text-sm outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-violet-600 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-violet-700 disabled:opacity-60"
              >
                {loading
                  ? 'Please wait...'
                  : authMode === 'login'
                    ? 'Sign In'
                    : 'Create Recruiter Account'}
              </button>

            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              {authMode === 'login'
                ? "Don't have an account?"
                : 'Already have an account?'}

              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login')
                  setError('')
                }}
                className="ml-2 font-semibold text-violet-600"
              >
                {authMode === 'login' ? 'Register' : 'Sign In'}
              </button>
            </div>

            <p className="mt-5 text-xs leading-5 text-slate-400">
              Clients should sign in using an account created for them.
            </p>

          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            © 2026 HireSense AI
          </p>

        </div>
      </div>
    )
  }

  // ==================================================
  // USER DETAILS
  // ==================================================

  const firstName = user.name?.split(' ')[0] || 'User'

  const initials = (user.name || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const filteredCandidates = candidates.filter((candidate) => {
    const search = searchTerm.toLowerCase()

    return (
      candidate.filename?.toLowerCase().includes(search) ||
      candidate.job_title?.toLowerCase().includes(search)
    )
  })

  const averageScore = candidates.length
    ? (
        candidates.reduce(
          (total, candidate) => total + candidate.match_score,
          0
        ) / candidates.length
      ).toFixed(1)
    : '0'

  // ==================================================
  // REUSABLE PAGE MESSAGES
  // ==================================================

  const PageMessages = () => (
    <>
      {pageError && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          {pageError}
        </div>
      )}

      {success && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle size={18} />
          {success}
        </div>
      )}
    </>
  )

  // ==================================================
  // LOADING STATE
  // ==================================================

  const LoadingState = () => (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <RefreshCw size={20} className="animate-spin" />
      Loading data...
    </div>
  )

  // ==================================================
  // RECRUITER DASHBOARD
  // ==================================================

  const RecruiterDashboard = () => (
    <div className="mx-auto max-w-7xl space-y-7 p-5 md:p-8">

      <PageMessages />

      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Welcome back, {firstName}! 👋
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage recruitment and screen candidates with AI.
          </p>
        </div>

        <button
          onClick={() => setActivePage('Resume Screening')}
          className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700"
        >
          <Upload size={18} />
          Upload Resumes
        </button>
      </section>

      {pageLoading ? (
        <LoadingState />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {[
              {
                title: 'Total Resumes',
                value: candidates.length,
                icon: FileText,
                color: 'bg-violet-100 text-violet-600'
              },
              {
                title: 'Candidates Screened',
                value: candidates.length,
                icon: Users,
                color: 'bg-blue-100 text-blue-600'
              },
              {
                title: 'Shared with Clients',
                value: candidates.filter((c) => c.shortlist_id).length,
                icon: UserCheck,
                color: 'bg-emerald-100 text-emerald-600'
              },
              {
                title: 'Available Clients',
                value: clients.length,
                icon: BriefcaseBusiness,
                color: 'bg-amber-100 text-amber-600'
              }
            ].map((stat) => {
              const Icon = stat.icon

              return (
                <div
                  key={stat.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}>
                    <Icon size={22} />
                  </div>

                  <p className="mt-5 text-sm text-slate-500">
                    {stat.title}
                  </p>

                  <h3 className="mt-1 text-3xl font-bold text-slate-900">
                    {stat.value}
                  </h3>
                </div>
              )
            })}

          </section>

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">

            <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
              <h3 className="font-bold text-slate-900">
                Screening Overview
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Average candidate match score across your screening records.
              </p>

              <div className="mt-6 flex items-center gap-4">
                <div className="text-4xl font-bold text-violet-600">
                  {averageScore}%
                </div>

                <div className="text-sm text-slate-500">
                  Average match score
                </div>
              </div>

              <button
                onClick={() => setActivePage('Candidates')}
                className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700"
              >
                View Candidates
              </button>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white">
              <BrainCircuit size={26} className="text-violet-300" />

              <h3 className="mt-5 text-xl font-bold">
                AI-powered screening
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                Compare candidate skills with job requirements and review transparent screening explanations.
              </p>
            </div>

          </section>
        </>
      )}

      <footer className="pb-3 text-center text-xs text-slate-400">
        © 2026 HireSense AI
      </footer>

    </div>
  )

  // ==================================================
  // RECRUITER CANDIDATES PAGE
  // ==================================================

  const CandidatesPage = () => (
    <div className="mx-auto max-w-7xl space-y-6 p-5 md:p-8">

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Candidate Management
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Review screened candidates and share profiles with clients.
          </p>
        </div>

        <button
          onClick={loadRecruiterData}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      <PageMessages />

      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <Search size={18} className="text-slate-400" />

        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search candidates or job titles..."
          className="w-full text-sm outline-none"
        />
      </div>

      {pageLoading ? (
        <LoadingState />
      ) : filteredCandidates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Users size={36} className="mx-auto text-slate-300" />

          <h3 className="mt-4 font-semibold text-slate-800">
            No candidates found
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Upload resumes to start screening candidates.
          </p>
        </div>
      ) : (
        <div className="space-y-4">

          {filteredCandidates.map((candidate) => (
            <div
              key={candidate.screening_result_id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >

              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">

                <div className="min-w-0">
                  <h3 className="break-all font-semibold text-slate-900">
                    {candidate.filename}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {candidate.job_title}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    Resume ID: {candidate.resume_id} · Screening ID: {candidate.screening_result_id}
                  </p>
                </div>

                <div className="shrink-0 rounded-xl bg-violet-50 px-5 py-3 text-center">
                  <p className="text-2xl font-bold text-violet-700">
                    {Number(candidate.match_score).toFixed(1)}%
                  </p>

                  <p className="text-xs text-violet-600">
                    Match Score
                  </p>
                </div>

              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Matched Skills
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {(candidate.matched_skills || []).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-lg bg-green-50 px-2.5 py-1 text-xs text-green-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Missing Skills
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {(candidate.missing_skills || []).length > 0
                      ? candidate.missing_skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs text-amber-700"
                          >
                            {skill}
                          </span>
                        ))
                      : <span className="text-sm text-slate-400">None</span>}
                  </div>
                </div>

              </div>

              <p className="mt-5 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                {candidate.explanation}
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">

                <select
                  value={clientSelections[candidate.screening_result_id] || ''}
                  onChange={(e) => setClientSelections({
                    ...clientSelections,
                    [candidate.screening_result_id]: e.target.value
                  })}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                >
                  <option value="">Select a client</option>

                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </option>
                  ))}
                </select>

                <button
                  disabled={!clients.length}
                  onClick={() => handleShortlist(candidate.screening_result_id)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserCheck size={17} />
                  Share with Client
                </button>

              </div>

            </div>
          ))}

        </div>
      )}

    </div>
  )

  // ==================================================
  // CLIENT DASHBOARD
  // ==================================================

  const ClientDashboard = () => (
    <div className="mx-auto max-w-7xl space-y-6 p-5 md:p-8">

      <PageMessages />

      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Welcome, {firstName}!
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Review candidates shared with you by recruiters.
        </p>
      </div>

      {pageLoading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <ClipboardList size={25} className="text-violet-600" />

            <p className="mt-4 text-sm text-slate-500">
              Candidates Shared
            </p>

            <h3 className="mt-1 text-3xl font-bold text-slate-900">
              {shortlist.length}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <UserCheck size={25} className="text-green-600" />

            <p className="mt-4 text-sm text-slate-500">
              Accepted Candidates
            </p>

            <h3 className="mt-1 text-3xl font-bold text-slate-900">
              {shortlist.filter((item) => item.status === 'accepted').length}
            </h3>
          </div>

        </div>
      )}

      <button
        onClick={() => setActivePage('My Shortlist')}
        className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700"
      >
        View My Shortlist
      </button>

    </div>
  )

  // ==================================================
  // CLIENT SHORTLIST PAGE
  // ==================================================

  const ClientShortlistPage = () => (
    <div className="mx-auto max-w-7xl space-y-6 p-5 md:p-8">

      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          My Shortlist
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Review candidates and update their evaluation status.
        </p>
      </div>

      <PageMessages />

      {pageLoading ? (
        <LoadingState />
      ) : shortlist.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <ClipboardList size={36} className="mx-auto text-slate-300" />

          <h3 className="mt-4 font-semibold text-slate-800">
            No candidates shared yet
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Candidates shared by recruiters will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">

          {shortlist.map((candidate) => (
            <div
              key={candidate.shortlist_id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >

              <div className="flex flex-col justify-between gap-4 sm:flex-row">

                <div className="min-w-0">
                  <h3 className="break-all font-semibold text-slate-900">
                    {candidate.filename}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {candidate.job_title}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    Shortlist ID: {candidate.shortlist_id}
                  </p>
                </div>

                <div className="rounded-xl bg-violet-50 px-5 py-3 text-center">
                  <p className="text-2xl font-bold text-violet-700">
                    {Number(candidate.match_score).toFixed(1)}%
                  </p>

                  <p className="text-xs text-violet-600">
                    Match Score
                  </p>
                </div>

              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Matched Skills
                </p>

                <div className="flex flex-wrap gap-2">
                  {(candidate.matched_skills || []).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg bg-green-50 px-2.5 py-1 text-xs text-green-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">

                <div className="flex-1">
                  <p className="mb-1 text-xs text-slate-500">
                    Current Status
                  </p>

                  <span className="inline-block rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold capitalize text-violet-700">
                    {candidate.status}
                  </span>
                </div>

                <div className="flex flex-col gap-2 sm:min-w-56">
                  <label className="text-xs font-medium text-slate-500">
                    Update Status
                  </label>

                  <select
                    value={candidate.status}
                    onChange={(e) => handleStatusUpdate(
                      candidate.shortlist_id,
                      e.target.value
                    )}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                  >
                    <option value="shortlisted">Shortlisted</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

              </div>

              {candidate.notes && (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                  {candidate.notes}
                </p>
              )}

            </div>
          ))}

        </div>
      )}

    </div>
  )

  // ==================================================
  // PAGE CONTENT
  // ==================================================

  const renderPage = () => {
    if (user.role === 'client') {
      if (activePage === 'My Shortlist') {
        return <ClientShortlistPage />
      }

      return <ClientDashboard />
    }

    switch (activePage) {
      case 'Resume Screening':
        return <ResumeScreening />

      case 'Candidates':
        return <CandidatesPage />

      case 'Dashboard':
        return <RecruiterDashboard />

      case 'Job Management':
        return (
          <div className="p-8">
            <PageMessages />
            <h2 className="text-2xl font-bold">Job Management</h2>
            <p className="mt-2 text-sm text-slate-500">
              Jobs are created automatically when resumes are screened.
              Use Resume Screening to create a new job.
            </p>
          </div>
        )

      case 'Reports & Analytics':
        return (
          <div className="p-8">
            <PageMessages />
            <h2 className="text-2xl font-bold">Reports & Analytics</h2>
            <p className="mt-2 text-sm text-slate-500">
              Average match score: {averageScore}%
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Total screening records: {candidates.length}
            </p>
          </div>
        )

      default:
        return <RecruiterDashboard />
    }
  }

  // ==================================================
  // MAIN APPLICATION
  // ==================================================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">

      {/* SIDEBAR */}

      <aside
        className={`${
          mobileMenu ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 md:translate-x-0`}
      >

        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white">
            <BrainCircuit size={25} />
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              HireSense<span className="text-violet-600"> AI</span>
            </h1>

            <p className="text-xs text-slate-400">
              Smart Recruitment Platform
            </p>
          </div>

        </div>

        <div className="px-4 pt-7">

          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>

          <nav className="space-y-1">

            {navigation.map((item) => {
              const Icon = item.icon
              const active = activePage === item.name

              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setActivePage(item.name)
                    setMobileMenu(false)
                    setPageError('')
                    setSuccess('')
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    active
                      ? 'bg-violet-50 text-violet-700'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={19} />

                  {item.name}

                  {active && (
                    <ChevronRight className="ml-auto" size={16} />
                  )}
                </button>
              )
            })}

          </nav>
        </div>

        <div className="mt-auto p-4">

          <div className="mb-4 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-4 text-white">
            <Sparkles size={22} className="mb-3" />

            <h3 className="font-semibold">
              {isClient ? 'Client Workspace' : 'AI-powered hiring'}
            </h3>

            <p className="mt-1 text-xs leading-5 text-violet-100">
              {isClient
                ? 'Review candidate profiles shared with your account.'
                : 'Find relevant talent faster with intelligent resume screening.'}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-500 hover:bg-red-50"
          >
            <LogOut size={19} />
            Logout
          </button>

          <div className="mt-3 flex items-center gap-3 border-t border-slate-100 px-2 pt-4">

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 font-semibold text-violet-700">
              {initials}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">
                {user.name}
              </p>

              <p className="text-xs capitalize text-slate-400">
                {user.role}
              </p>
            </div>

          </div>

        </div>

      </aside>

      {/* MOBILE OVERLAY */}

      {mobileMenu && (
        <div
          onClick={() => setMobileMenu(false)}
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
        />
      )}

      {/* MAIN CONTENT */}

      <main className="min-h-screen md:ml-64">

        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-8">

          <div className="flex items-center gap-3">

            <button
              onClick={() => setMobileMenu(true)}
              className="rounded-lg p-2 hover:bg-slate-100 md:hidden"
            >
              <Menu size={22} />
            </button>

            <div>
              <p className="text-sm text-slate-400">
                Workspace / {activePage}
              </p>

              <h2 className="text-lg font-bold text-slate-900">
                {activePage}
              </h2>
            </div>

          </div>

          <div className="flex items-center gap-3">

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {firstName}
              </p>

              <p className="text-xs capitalize text-slate-400">
                {user.role}
              </p>
            </div>

          </div>

        </header>

        {renderPage()}

      </main>

    </div>
  )
}

export default App