import DashboardPage from "../doctor/DashboardPage"
import DoctorNavbar from "../doctor/DoctorNavbar"


const DHome = () => {
  return (
    <div>
      <DoctorNavbar/>
      <DashboardPage className="mt-5"/>
    </div>
  )
}

export default DHome
