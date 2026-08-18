import {certificationStyles} from '../assets/dummyStyles'
import C3 from "../assets/images2.jfif"
import C1 from "../assets/images.jfif"
import C2 from "../assets/images1.jfif"
import C4 from "../assets/images3.jpg"
import C5 from "../assets/quality.jpg"
import C6 from "../assets/asd.png"
import C7 from "../assets/images4.jfif"

const Certification = () => {
   const certifications = [
  { id: 1, name: "Medical Commission", image: C1, alt: "PMDC Certification", type: "government" },
  { id: 2, name: "Govt Health Approved", image: C2, alt: "Government Health Approved", type: "government" },
  { id: 3, name: "Healthcare Commission", image: C3, alt: "Healthcare Commission Certified", type: "healthcare" },
  { id: 4, name: "Para Medical Council", image: C4, alt: "Medical Council Pakistan", type: "government" },
  { id: 5, name: "Quality Healthcare", image: C5, alt: "Quality Healthcare Standard", type: "international" },
  { id: 6, name: "Paramedical Council", image: C6, alt: "Paramedical Council Approved", type: "healthcare" },
  { id: 7, name: "Ministry of Health", image: C7, alt: "Ministry of Health PK", type: "government" }
];

  const duplicatedCertifications = [...certifications, ...certifications, ...certifications];
  return (
    <div className={certificationStyles.container}>
      <div className={certificationStyles.backgroundGrid}>
        <div className={certificationStyles.topLine}></div>
        <div className={certificationStyles.gridContainer}>
            <div className={certificationStyles.grid}>
                {Array.from({length: 144}).map((_,i) => (
                    <div key={i} className={certificationStyles.gridCell}></div>
                ))}
            </div>
        </div>
      </div>

    <div className={certificationStyles.contentWrapper}>
       <div className={certificationStyles.headingContainer}>
            <div className={certificationStyles.headingInner}>
                <div className={certificationStyles.leftLine}></div>
                <div className={certificationStyles.rightLine}></div>

                <h2 className={certificationStyles.title}>
                    <span className={certificationStyles.titleText}>
                        CERTIFIED & EXCELLENCE
                    </span>
                </h2>
            </div>

            <p className={certificationStyles.subtitle}> 
                Government recognized and internationally accredited healthcare standards
            </p>

            <div className={certificationStyles.badgeContainer} >
                <div className={certificationStyles.badgeDot}> </div>
                <span className={certificationStyles.badgeText}>
                    OFFICIALLY CERTIFIED
                </span>
            </div>
       </div>

       <div className={certificationStyles.logosContainer}>
            <div className={certificationStyles.logosInner}>
                <div className={certificationStyles.logosFlexContainer}>
                    <div className={certificationStyles.logosMarquee}>
                        {duplicatedCertifications.map((cert, index) => (
                            <div key={`cert-${cert.id}-${index}`}
                            className={certificationStyles.logoItem}>
                            <div className="relative">
                                <img src={cert.image} alt={cert.name}
                                className={certificationStyles.logoImage} />
                            </div>
                            <span className={certificationStyles.logoText}>
                                {cert.name}
                            </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
       </div>

    </div>
    <style>{certificationStyles.animationStyles}</style>
    </div>
  )
}

export default Certification
