
import { useRef, useState } from 'react'
import {
  UploadCloud, FileText, FileCheck2, X,
  BriefcaseBusiness, Sparkles, AlertCircle,
  CheckCircle2, Trash2, BrainCircuit
} from 'lucide-react'

const API_URL = 'http://127.0.0.1:8000'

function ResumeScreening() {
  const fileInputRef = useRef(null)

  const [files, setFiles] = useState([])
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const [prepared, setPrepared] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [results, setResults] = useState([])
  const [jobId, setJobId] = useState(null)

  const MAX_FILE_SIZE = 10 * 1024 * 1024

  const handleFiles = (selectedFiles) => {
    setError('')
    setPrepared(false)
    setResults([])

    const validFiles = []
    const allowedExtensions = ['pdf', 'docx']

    Array.from(selectedFiles).forEach((file) => {
      const extension = file.name.split('.').pop().toLowerCase()

      if (!allowedExtensions.includes(extension)) {
        setError('Only PDF and DOCX files are allowed.')
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} exceeds the 10 MB limit.`)
        return
      }

      const duplicate = [...files, ...validFiles].some(
        (existing) =>
          existing.name === file.name &&
          existing.size === file.size
      )

      if (!duplicate) {
        validFiles.push(file)
      }
    })

    setFiles((previous) => [...previous, ...validFiles])
  }

  const removeFile = (index) => {
    setFiles((previous) => previous.filter((_, i) => i !== index))
    setPrepared(false)
    setResults([])
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')
    setPrepared(false)
    setResults([])
    setJobId(null)

    if (!files.length) {
      setError('Please upload at least one resume.')
      return
    }

    if (!jobTitle.trim()) {
      setError('Please enter the job title.')
      return
    }

    if (!jobDescription.trim()) {
      setError('Please enter the job description.')
      return
    }

    // Get JWT token from the authenticated session
    const token = sessionStorage.getItem('access_token')

    if (!token) {
      setError('Please log in as a recruiter before uploading resumes.')
      return
    }

    try {
      setIsSubmitting(true)

      const formData = new FormData()

      formData.append('job_title', jobTitle.trim())
      formData.append('job_description', jobDescription.trim())

      files.forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetch(
        `${API_URL}/api/resumes/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        }
      )

      const data = await response.json()

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          'Authentication failed. Please log in again with a recruiter account.'
        )
      }

      if (!response.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : JSON.stringify(data.detail || 'Resume upload failed.')
        )
      }

      setResults(data.resumes || [])
      setJobId(data.job_id)
      setPrepared(true)

    } catch (err) {
      console.error('Resume screening error:', err)
      setError(err.message || 'Unable to connect to the backend.')

    } finally {
      setIsSubmitting(false)
    }
  }

  const formatSize = (bytes) => {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-emerald-600'
    if (score >= 50) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7 p-5 md:p-8">

      {/* Page heading */}
      <section>
        <div className="flex items-center gap-2 text-sm text-violet-600">
          <Sparkles size={17} />
          <span className="font-semibold">AI Recruitment</span>
        </div>

        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          Resume Screening
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Upload candidate resumes and evaluate them against job requirements.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Upload section */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">
                Upload Resumes
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Upload PDF or DOCX candidate documents
              </p>
            </div>

            <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
              <UploadCloud size={23} />
            </div>
          </div>

          <div
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
              isDragging
                ? 'border-violet-600 bg-violet-50'
                : 'border-slate-300 bg-slate-50 hover:border-violet-400 hover:bg-violet-50/50'
            }`}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              <UploadCloud size={32} />
            </div>

            <h4 className="mt-4 font-semibold text-slate-800">
              Drag and drop your resumes here
            </h4>

            <p className="mt-2 text-sm text-slate-500">
              Or click to browse files
            </p>

            <span className="mt-4 inline-flex rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white">
              Browse Files
            </span>

            <p className="mt-4 text-xs text-slate-400">
              PDF, DOCX · Maximum 10 MB per file
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              multiple
              className="hidden"
              onChange={(event) => {
                handleFiles(event.target.files)
                event.target.value = ''
              }}
            />
          </div>

          {files.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-800">
                  Selected Resumes ({files.length})
                </h4>

                <button
                  type="button"
                  onClick={() => {
                    setFiles([])
                    setResults([])
                    setPrepared(false)
                    setError('')
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-red-500"
                >
                  <Trash2 size={14} />
                  Remove all
                </button>
              </div>

              <div className="space-y-3">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-lg bg-violet-50 p-3 text-violet-600">
                        <FileText size={21} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {file.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatSize(file.size)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Job requirements */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <BriefcaseBusiness size={22} />
            </div>

            <div>
              <h3 className="font-bold text-slate-900">
                Job Requirements
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Define the role for resume evaluation
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Job Title *
              </label>

              <input
                type="text"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="e.g. Data Analyst"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Job Description *
              </label>

              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                rows={7}
                placeholder="Include required skills, qualifications and responsibilities..."
                className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                {jobDescription.trim().length} characters
              </p>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} />
            {error}
          </div>
        )}

        {/* Success */}
        {prepared && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 size={21} className="mt-0.5" />

            <div>
              <p className="font-semibold">
                Screening completed successfully!
              </p>
              <p className="mt-1 text-sm">
                {results.length} resume(s) processed and saved.
              </p>
              <p className="mt-1 text-xs">
                Job ID: {jobId}
              </p>
            </div>
          </div>
        )}

        {/* Screening results */}
        {results.length > 0 && (
          <section className="space-y-4">

            <h3 className="text-lg font-bold text-slate-900">
              Candidate Screening Results
            </h3>

            {results.map((resume, index) => (
              <div
                key={resume.id || index}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-violet-600">
                      RANK #{index + 1}
                    </span>

                    <h4 className="mt-1 break-all font-semibold text-slate-800">
                      {resume.filename}
                    </h4>

                    <p className="mt-1 text-xs text-slate-400">
                      Resume ID: {resume.id} · Screening ID: {resume.screening_result_id}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500">
                      AI Match Score
                    </p>
                    <p className={`mt-1 text-3xl font-bold ${getScoreColor(resume.match_score)}`}>
                      {resume.match_score}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-violet-600"
                    style={{
                      width: `${Math.min(100, Math.max(0, resume.match_score))}%`
                    }}
                  />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Skill Coverage</p>
                    <p className="mt-1 text-lg font-bold text-slate-800">
                      {resume.skill_coverage}%
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Text Similarity</p>
                    <p className="mt-1 text-lg font-bold text-slate-800">
                      {resume.text_similarity}%
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <h5 className="mb-2 text-sm font-semibold text-slate-800">
                    Matched Skills
                  </h5>

                  <div className="flex flex-wrap gap-2">
                    {resume.matched_skills?.length > 0 ? (
                      resume.matched_skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                        >
                          <CheckCircle2 size={12} className="mr-1 inline" />
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">No matched skills detected.</span>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <h5 className="mb-2 text-sm font-semibold text-slate-800">
                    Missing Skills
                  </h5>

                  <div className="flex flex-wrap gap-2">
                    {resume.missing_skills?.length > 0 ? (
                      resume.missing_skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">No missing recognized skills.</span>
                    )}
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-violet-100 bg-violet-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-violet-800">
                    <BrainCircuit size={17} />
                    AI Analysis
                  </div>

                  <p className="mt-2 text-sm text-slate-700">
                    {resume.explanation}
                  </p>

                  <p className="mt-2 text-xs font-semibold text-violet-700">
                    Confidence: {resume.confidence}
                  </p>
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  Automated screening indicator only. Final hiring decisions require human review.
                </p>
              </div>
            ))}
          </section>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles size={18} />
            {isSubmitting ? 'Processing Resumes...' : 'Process Resumes'}
          </button>
        </div>

      </form>
    </div>
  )
}

export default ResumeScreening
