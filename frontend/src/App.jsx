import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

function App() {
  const [data, setData] = useState([])
  const [blockFilter, setBlockFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 20

  useEffect(() => {
    const fetchData = async () => {
      const { data: rows, error } = await supabase
        .from('highest_personday_works')
        .select('*')

      if (error) {
        console.error('Supabase Error:', error)
        return
      }

      const normalizedRows = rows
        .filter(row => row.date && /^\d{2}\/\d{2}\/\d{4}$/.test(row.date))
        .map(row => {
          const [day, month, year] = row.date.split('/')
          const isoDate = new Date(`${year}-${month}-${day}`).toISOString().split('T')[0] // YYYY-MM-DD
          return { ...row, date: isoDate }
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date))

      setData(normalizedRows)
    }

    fetchData()
  }, [])

  const blocks = [...new Set(data.map(row => row.block))].filter(Boolean)
  const availableDates = [...new Set(data.map(row => row.date))].filter(Boolean).sort()

  const filteredData = data.filter(row =>
    (blockFilter ? row.block === blockFilter : true) &&
    (dateFilter ? row.date === dateFilter : true)
  )

  const indexOfLastRow = currentPage * rowsPerPage
  const indexOfFirstRow = indexOfLastRow - rowsPerPage
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow)
  const totalPages = Math.ceil(filteredData.length / rowsPerPage)

  const exportToExcel = () => {
    const formattedData = filteredData.map(row => ({
      ...row,
      date: new Date(row.date).toLocaleDateString('en-GB'), // DD/MM/YYYY
    }))
  
    const worksheet = XLSX.utils.json_to_sheet(formattedData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')
  
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const file = new Blob([excelBuffer], { type: 'application/octet-stream' })
  
    const blockPart = blockFilter ? `_${blockFilter}` : ''
    const datePart = dateFilter
      ? `_${new Date(dateFilter).toLocaleDateString('en-GB').replace(/\//g, '-')}`
      : ''
    const fileName = `personday_data${blockPart}${datePart}.xlsx`
  
    saveAs(file, fileName)
  }
  
  return (
    <div className="container my-5">
    <h1 className="mb-4 display-4 fw-bold text-primary text-center">रोज़गार दर्शक</h1>

      <p className="mb-4 fs-5">
        यह एक डैशबोर्ड है जो रोज़ाना MGNREGA के कामों पर सबसे ज़्यादा मज़दूरों की मौजूदगी को दिखाता है।
        यह NMMS ऐप से डेटा लेकर उन कामों की पहचान करता है जहाँ एक दिन में सबसे अधिक मानव-दिवस (persondays) 
        सृजित किए गए हैं। इससे अधिकारी योजना के सही क्रियान्वयन को सुनिश्चित कर सकते हैं।
      </p>

      <div className="mb-3 d-flex flex-wrap gap-3 align-items-center">
        {/* Block Filter */}
        <select
          className="form-select w-auto"
          value={blockFilter}
          onChange={e => {
            setBlockFilter(e.target.value)
            setCurrentPage(1)
          }}
        >
          <option value="">All Blocks</option>
          {blocks.map((block, idx) => (
            <option key={idx} value={block}>
              {block}
            </option>
          ))}
        </select>

        {/* Date Picker */}
        <div className="d-flex align-items-center gap-2">
        <label htmlFor="dateSelect">Date:</label>
        <select
          id="dateSelect"
          className="form-select"
          value={dateFilter}
          onChange={e => {
            setDateFilter(e.target.value)
            setCurrentPage(1)
          }}
        >
          <option value="">All Dates</option>
          {[...availableDates].reverse().map((date, idx) => (
            <option key={idx} value={date}>
              {new Date(date).toLocaleDateString('en-GB')}
            </option>
          ))}
        </select>
      </div>

        <button className="btn btn-success" onClick={exportToExcel}>
          Download Excel
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered table-hover">
          <thead className="table-light">
            <tr>
              <th>Block</th>
              <th>Panchayat</th>
              <th>Date</th>
              <th>Work Code</th>
              <th>Highest Persondays</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.length > 0 ? (
              currentRows.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.block}</td>
                  <td>{row.panchayat}</td>
                  <td>{new Date(row.date).toLocaleDateString('en-GB')}</td>
                  <td>{row.work_code}</td>
                  <td>{row.number_of_workers_employed}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center">No data found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-3">
          <nav>
            <ul className="pagination">
              {Array.from({ length: totalPages }, (_, i) => (
                <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(i + 1)}>
                    {i + 1}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </div>
  )
}

export default App
