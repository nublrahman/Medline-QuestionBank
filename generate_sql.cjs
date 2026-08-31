const fs = require('fs');

const data = [
  // Image 1
  {
    type: "mcq-single", category: "Pediatrics", subcategory: "Growth & Development", difficulty: "Knowledge", time: 60,
    question: "Which developmental milestone is typically achieved by a healthy infant by approximately 6 months of age?",
    options: ["Walking independently", "Sitting with support", "Speaking two word sentences", "Riding a tricycle"],
    correct: ["B"], rationale: "Most infants can sit with support around 6 months."
  },
  {
    type: "mcq-single", category: "Pediatrics", subcategory: "Immunization", difficulty: "Knowledge", time: 60,
    question: "Which vaccine is commonly administered to prevent tuberculosis?",
    options: ["BCG", "MMR", "DPT", "OPV"],
    correct: ["A"], rationale: "BCG is used primarily for protection against tuberculosis."
  },
  {
    type: "mcq-multi", category: "Pediatrics", subcategory: "Neonatology", difficulty: "Application", time: 90,
    question: "Which of the following are common signs of neonatal respiratory distress?",
    options: ["Grunting", "Nasal flaring", "Chest retractions", "Bradycardia as the primary sign", "Tachypnea"],
    correct: ["A", "B", "C", "E"], rationale: "Grunting, nasal flaring, chest retractions, and tachypnea are important signs of neonatal respiratory distress."
  },
  {
    type: "mcq-single", category: "Anatomy", subcategory: "Upper Limb", difficulty: "Knowledge", time: 60,
    question: "Which nerve supplies the deltoid muscle?",
    options: ["Radial nerve", "Median nerve", "Axillary nerve", "Ulnar nerve"],
    correct: ["C"], rationale: "The axillary nerve supplies the deltoid and teres minor muscles."
  },
  {
    type: "mcq-multi", category: "Anatomy", subcategory: "Cranial Nerves", difficulty: "Analysis", time: 90,
    question: "Which of the following cranial nerves primarily control eye movements?",
    options: ["Oculomotor nerve", "Optic nerve", "Trochlear nerve", "Abducens nerve", "Facial nerve"],
    correct: ["A", "C", "D"], rationale: "Cranial nerves III, IV, and VI control the extraocular muscles responsible for eye movement."
  },
  {
    type: "mcq-single", category: "Anatomy", subcategory: "Abdomen", difficulty: "Knowledge", time: 60,
    question: "Which organ is primarily located in the right upper quadrant of the abdomen?",
    options: ["Spleen", "Liver", "Sigmoid colon", "Urinary bladder"],
    correct: ["B"], rationale: "The liver occupies most of the right upper quadrant."
  },
  {
    type: "mcq-single", category: "Physiology", subcategory: "Cardiovascular", difficulty: "Knowledge", time: 60,
    question: "What is the normal primary pacemaker of the human heart?",
    options: ["AV node", "Bundle of His", "SA node", "Purkinje fibers"],
    correct: ["C"], rationale: "The sinoatrial node generates the normal electrical impulse."
  },
  {
    type: "mcq-multi", category: "Physiology", subcategory: "Respiratory", difficulty: "Application", time: 90,
    question: "Which factors can increase respiratory rate?",
    options: ["Exercise", "Fever", "Metabolic acidosis", "Severe central nervous system depression", "Anxiety"],
    correct: ["A", "B", "C", "E"], rationale: "Exercise, fever, acidosis, and anxiety can stimulate ventilation."
  },
  {
    type: "mcq-single", category: "Physiology", subcategory: "Renal", difficulty: "Application", time: 60,
    question: "Which hormone increases water reabsorption in the collecting ducts of the kidney?",
    options: ["Insulin", "ADH", "Thyroxine", "Glucagon"],
    correct: ["B"], rationale: "ADH increases water permeability of the collecting ducts."
  },
  {
    type: "mcq-single", category: "Biochemistry", subcategory: "Metabolism", difficulty: "Knowledge", time: 60,
    question: "Which molecule is the primary energy currency of the cell?",
    options: ["DNA", "ATP", "RNA", "NAD+"],
    correct: ["B"], rationale: "ATP stores and transfers energy for many cellular processes."
  },
  // Image 2
  {
    type: "mcq-multi", category: "Biochemistry", subcategory: "Vitamins", difficulty: "Knowledge", time: 90,
    question: "Which of the following are fat-soluble vitamins?",
    options: ["Vitamin A", "Vitamin B12", "Vitamin D", "Vitamin E", "Vitamin K"],
    correct: ["A", "C", "D", "E"], rationale: "The fat-soluble vitamins are A, D, E, and K."
  },
  {
    type: "mcq-single", category: "Biochemistry", subcategory: "Enzymes", difficulty: "Application", time: 90,
    question: "Which enzyme is commonly used as a laboratory marker of hepatocellular injury?",
    options: ["ALT", "Amylase", "Troponin", "Creatine kinase-MB"],
    correct: ["A"], rationale: "ALT is commonly used as a marker of hepatocellular injury."
  },
  {
    type: "mcq-single", category: "Community Medicine", subcategory: "Epidemiology", difficulty: "Knowledge", time: 60,
    question: "Which measure describes the number of existing cases of a disease in a population at a particular point in time?",
    options: ["Incidence", "Prevalence", "Mortality", "Case fatality rate"],
    correct: ["B"], rationale: "Prevalence measures existing cases in a population."
  },
  {
    type: "mcq-multi", category: "Community Medicine", subcategory: "Screening", difficulty: "Application", time: 90,
    question: "Which characteristics are desirable for an effective screening test?",
    options: ["High sensitivity", "Acceptable cost", "Reasonable specificity", "Poor reproducibility", "Easy administration"],
    correct: ["A", "B", "C", "E"], rationale: "A useful screening test should be sensitive, reasonably specific, affordable, practical, and reproducible."
  },
  {
    type: "mcq-single", category: "Community Medicine", subcategory: "Biostatistics", difficulty: "Analysis", time: 60,
    question: "Which measure is most appropriate for describing the average value of a normally distributed continuous variable?",
    options: ["Mean", "Mode", "Range", "IQR"],
    correct: ["A"], rationale: "The arithmetic mean is commonly used for normally distributed continuous data."
  },
  {
    type: "mcq-single", category: "General Medicine", subcategory: "Cardiology", difficulty: "Application", time: 60,
    question: "A patient presents with crushing central chest pain radiating to the left arm. Which investigation is most important initially?",
    options: ["ECG", "MRI brain", "Endoscopy", "Abdominal ultrasound"],
    correct: ["A"], rationale: "An ECG should be obtained primarily in suspected acute coronary syndrome."
  },
  {
    type: "mcq-multi", category: "General Medicine", subcategory: "Diabetes Mellitus", difficulty: "Application", time: 90,
    question: "Which of the following are recognized complications of diabetes mellitus?",
    options: ["Diabetic neuropathy", "Diabetic retinopathy", "Peripheral neuropathy", "Hypothyroidism in every patient", "Cardiovascular disease"],
    correct: ["A", "B", "C", "E"], rationale: "Diabetes can cause nephropathy, retinopathy, neuropathy, and increased cardiovascular risk."
  },
  {
    type: "mcq-single", category: "General Medicine", subcategory: "Respiratory Medicine", difficulty: "Application", time: 90,
    question: "Which finding is most characteristic of an acute asthma attack?",
    options: ["Wheezing", "Jaundice", "Hematuria", "Bradykinesia"],
    correct: ["A"], rationale: "Wheezing is a common finding caused by airway narrowing during asthma exacerbation."
  },
  {
    type: "mcq-single", category: "Surgery", subcategory: "Trauma", difficulty: "Application", time: 90,
    question: "In the initial assessment of a severely injured trauma patient, which approach is commonly followed?",
    options: ["ABCDE", "EDCBA", "SOAP", "SAMPLE only"],
    correct: ["A"], rationale: "The ABCDE approach provides a structured primary survey."
  },
  {
    type: "mcq-multi", category: "Surgery", subcategory: "Wound Management", difficulty: "Knowledge", time: 90,
    question: "Which factors can delay wound healing?",
    options: ["Infection", "Poor nutrition", "Diabetes mellitus", "Adequate oxygenation", "Poor blood supply"],
    correct: ["A", "B", "C", "E"], rationale: "Infection, malnutrition, diabetes, and poor tissue perfusion can impair wound healing."
  },
  // Image 3
  {
    type: "mcq-single", category: "Surgery", subcategory: "Acute Abdomen", difficulty: "Analysis", time: 120,
    question: "A patient presents with severe right lower abdominal pain, fever, nausea, and loss of appetite. Which condition should be strongly considered?",
    options: ["Acute appendicitis", "Migraine", "Otitis media", "Acute glaucoma"],
    correct: ["A"], rationale: "Right lower quadrant pain with fever, nausea, and anorexia suggests acute appendicitis."
  },
  {
    type: "mcq-single", category: "Pediatrics", subcategory: "Growth & Development", difficulty: "Knowledge", time: 60,
    question: "At what age does an infant typically begin to smile socially?",
    options: ["2 weeks", "2 months", "6 months", "12 months"],
    correct: ["B"], rationale: "Social smiling commonly begins around 2 months of age."
  },
  {
    type: "mcq-multi", category: "Pediatrics", subcategory: "Nutrition", difficulty: "Knowledge", time: 90,
    question: "Which nutrients are particularly important for healthy growth in children?",
    options: ["Protein", "Iron", "Calcium", "Trans fat", "Vitamin D"],
    correct: ["A", "B", "C", "E"], rationale: "Protein, iron, calcium, and vitamin D support normal growth and development."
  },
  {
    type: "mcq-single", category: "Pediatrics", subcategory: "Infectious Diseases", difficulty: "Application", time: 90,
    question: "A child with a barking cough and inspiratory stridor most likely has which condition?",
    options: ["Croup", "Asthma", "Pneumonia", "Bronchiolitis"],
    correct: ["A"], rationale: "A barking cough with inspiratory stridor is characteristic of croup."
  },
  {
    type: "mcq-single", category: "Anatomy", subcategory: "Lower Limb", difficulty: "Knowledge", time: 60,
    question: "Which muscle is primarily responsible for extension of the knee?",
    options: ["Biceps femoris", "Quadriceps femoris", "Gastrocnemius", "Sartorius"],
    correct: ["B"], rationale: "The quadriceps femoris group extends the knee."
  },
  {
    type: "mcq-multi", category: "Anatomy", subcategory: "Thorax", difficulty: "Knowledge", time: 90,
    question: "Which structures are found in the mediastinum?",
    options: ["Heart", "Trachea", "Esophagus", "Lungs", "Aorta"],
    correct: ["A", "B", "C", "E"], rationale: "The mediastinum contains the heart, trachea, esophagus, and major vessels; the lungs are outside it."
  },
  {
    type: "mcq-single", category: "Anatomy", subcategory: "Neuroanatomy", difficulty: "Application", time: 90,
    question: "Which part of the brain is primarily responsible for maintaining balance and coordination?",
    options: ["Cerebellum", "Medulla", "Hypothalamus", "Thalamus"],
    correct: ["A"], rationale: "The cerebellum plays a major role in coordination, posture, and balance."
  },
  {
    type: "mcq-single", category: "Physiology", subcategory: "Endocrine", difficulty: "Knowledge", time: 60,
    question: "Which hormone lowers blood glucose concentration?",
    options: ["Glucagon", "Cortisol", "Insulin", "Adrenaline"],
    correct: ["C"], rationale: "Insulin lowers blood glucose by promoting glucose uptake and storage."
  },
  {
    type: "mcq-multi", category: "Physiology", subcategory: "Cardiovascular", difficulty: "Application", time: 90,
    question: "Which factors can increase cardiac output?",
    options: ["Increased heart rate", "Increased stroke volume", "Increased contractility", "Severe bradycardia"],
    correct: ["A", "B", "C"], rationale: "Cardiac output equals heart rate multiplied by stroke volume; increased heart rate, stroke volume, or contractility can increase it."
  },
  {
    type: "mcq-single", category: "Physiology", subcategory: "Gastrointestinal", difficulty: "Knowledge", time: 60,
    question: "Where does most nutrient absorption occur?",
    options: ["Stomach", "Small Intestine", "Large Intestine", "Esophagus"],
    correct: ["B"], rationale: "Most digestion and nutrient absorption occur in the small intestine."
  },
  // Image 4
  {
    type: "mcq-multi", category: "Biochemistry", subcategory: "Carbohydrate Metabolism", difficulty: "Knowledge", time: 90,
    question: "Which substances can serve as sources for glucose production during gluconeogenesis?",
    options: ["Lactate", "Glycerol", "Glucogenic amino acids", "Dietary glucose"],
    correct: ["A", "B", "C"], rationale: "Lactate, glycerol, and glucogenic amino acids can contribute to gluconeogenesis."
  },
  {
    type: "mcq-single", category: "Biochemistry", subcategory: "Proteins", difficulty: "Knowledge", time: 60,
    question: "Which amino acid is essentially in adults?",
    options: ["Alanine", "Glycine", "Leucine", "Glutamate"],
    correct: ["C"], rationale: "Leucine is an essential amino acid and must be obtained from the diet."
  },
  {
    type: "mcq-single", category: "Biochemistry", subcategory: "Clinical Biochemistry", difficulty: "Application", time: 90,
    question: "Which laboratory test is commonly used to assess long-term glycemic control?",
    options: ["HbA1c", "Serum sodium", "Bilirubin", "Amylase"],
    correct: ["A"], rationale: "HbA1c reflects average blood glucose over approximately the previous 2-3 months."
  },
  {
    type: "mcq-multi", category: "Community Medicine", subcategory: "Epidemiology", difficulty: "Application", time: 90,
    question: "Which are measures commonly used to describe disease occurrence?",
    options: ["Incidence", "Prevalence", "Attack rate", "Mean arterial pressure"],
    correct: ["A", "B", "C"], rationale: "Incidence, prevalence, and attack rate are measures used in epidemiology."
  },
  {
    type: "mcq-single", category: "Community Medicine", subcategory: "Vaccination", difficulty: "Knowledge", time: 60,
    question: "What is the main purpose of herd immunity?",
    options: ["Increase individual treatment adherence", "Reduce transmission within a population", "Replace all vaccines", "Increase antibiotic use"],
    correct: ["B"], rationale: "Herd immunity reduces transmission when enough people in a population are immune."
  },
  {
    type: "mcq-multi", category: "Community Medicine", subcategory: "Health Education", difficulty: "Application", time: 90,
    question: "Which are important principles of effective health education?",
    options: ["Clear communication", "Audience participation", "Culturally appropriate information", "Use of unnecessarily complex language"],
    correct: ["A", "B", "C"], rationale: "Effective health education should be understandable, participatory, and culturally appropriate."
  },
  {
    type: "mcq-single", category: "Community Medicine", subcategory: "Screening", difficulty: "Analysis", time: 90,
    question: "A highly sensitive screening test is especially useful when the goal is to:",
    options: ["Minimize false negatives", "Minimize false positives", "Confirm a diagnosis definitively", "Measure treatment adherence"],
    correct: ["A"], rationale: "High sensitivity helps identify most people who have the condition, reducing false negatives."
  },
  {
    type: "mcq-single", category: "General Medicine", subcategory: "Cardiology", difficulty: "Knowledge", time: 60,
    question: "Which blood vessel carries oxygenated blood from the lungs to the heart?",
    options: ["Pulmonary artery", "Pulmonary vein", "Superior vena cava", "Coronary sinus"],
    correct: ["B"], rationale: "Pulmonary veins carry oxygenated blood from the lungs to the left atrium."
  },
  {
    type: "mcq-multi", category: "General Medicine", subcategory: "Hypertension", difficulty: "Application", time: 90,
    question: "Which lifestyle measures can help reduce blood pressure?",
    options: ["Regular physical activity", "Reducing excess sodium intake", "Maintaining a healthy weight", "Smoking cessation"],
    correct: ["A", "B", "C", "D"], rationale: "Physical activity, sodium reduction, healthy weight, and smoking cessation can support blood pressure control."
  },
  {
    type: "mcq-single", category: "General Medicine", subcategory: "Neurology", difficulty: "Application", time: 90,
    question: "A patient suddenly develops facial weakness, arm weakness, and speech difficulty. What is the most appropriate concern?",
    options: ["Stroke", "Migraine only", "Otitis media", "Gastritis"],
    correct: ["A"], rationale: "Sudden focal neurological deficits are concerning for acute stroke and require urgent assessment."
  },
  // Image 5
  {
    type: "mcq-multi", category: "General Medicine", subcategory: "Infectious Diseases", difficulty: "Knowledge", time: 90,
    question: "Which findings can commonly occur with infection?",
    options: ["Fever", "Elevated inflammatory markers", "Malaise", "Always severe hypotension"],
    correct: ["A", "B", "C"], rationale: "Fever, inflammatory markers elevation, and malaise can occur with infection; severe hypotension is not universal."
  },
  {
    type: "mcq-single", category: "General Medicine", subcategory: "Gastroenterology", difficulty: "Application", time: 90,
    question: "Which symptom is commonly associated with gastroesophageal reflux disease?",
    options: ["Heartburn", "Hematuria", "Hearing loss", "Joint deformity"],
    correct: ["A"], rationale: "Heartburn is a common symptom of gastroesophageal reflux disease."
  },
  {
    type: "mcq-multi", category: "Surgery", subcategory: "Preoperative Care", difficulty: "Knowledge", time: 90,
    question: "Which factors are important when assessing a patient before surgery?",
    options: ["Medical history", "Medication history", "Allergies", "Previous anesthesia problems"],
    correct: ["A", "B", "C", "D"], rationale: "A complete preoperative assessment includes medical history, medications, allergies, and previous anesthesia issues."
  },
  {
    type: "mcq-single", category: "Surgery", subcategory: "Trauma", difficulty: "Application", time: 90,
    question: "In a trauma patient with suspected cervical spine injury, which principle is important?",
    options: ["Maintain spinal precautions", "Encourage unrestricted neck movement", "Delay airway assessment", "Ask the patient to walk"],
    correct: ["A"], rationale: "Spinal precautions help reduce the risk of worsening a cervical spine injury."
  },
  {
    type: "mcq-multi", category: "Surgery", subcategory: "Postoperative Care", difficulty: "Application", time: 90,
    question: "Which complications should be monitored for after major surgery?",
    options: ["Bleeding", "Infection", "Venous thromboembolism", "Respiratory complications"],
    correct: ["A", "B", "C", "D"], rationale: "Bleeding, infection, thromboembolism, and respiratory complications are important postoperative concerns."
  },
  {
    type: "mcq-single", category: "Surgery", subcategory: "Acute Abdomen", difficulty: "Analysis", time: 120,
    question: "A patient has severe abdominal pain with guarding and rebound tenderness. What does this finding suggest?",
    options: ["Peritoneal irritation", "Simple headache", "Chronic rhinitis", "Otitis externa"],
    correct: ["A"], rationale: "Guarding and rebound tenderness can indicate peritoneal irritation and require urgent evaluation."
  },
  {
    type: "mcq-multi", category: "Pediatrics", subcategory: "Emergency Pediatrics", difficulty: "Application", time: 90,
    question: "Which are warning signs of serious illness in a child?",
    options: ["Altered consciousness", "Difficulty breathing", "Severe dehydration", "Persistent inability to drink"],
    correct: ["A", "B", "C", "D"], rationale: "Altered consciousness, respiratory difficulty, severe dehydration, and inability to drink are important warning signs."
  },
  {
    type: "mcq-single", category: "Anatomy", subcategory: "Head & Neck", difficulty: "Knowledge", time: 60,
    question: "Which cranial nerve is responsible for facial expression?",
    options: ["Trigeminal nerve", "Facial nerve", "Vagus nerve", "Hypoglossal nerve"],
    correct: ["B"], rationale: "The facial nerve supplies the muscles of facial expression."
  },
  {
    type: "mcq-multi", category: "Physiology", subcategory: "Blood", difficulty: "Knowledge", time: 90,
    question: "Which are functions of red blood cells?",
    options: ["Transport oxygen", "Transport some carbon dioxide", "Contribute to blood buffering", "Produce antibodies"],
    correct: ["A", "B", "C"], rationale: "Red blood cells transport oxygen, carry some carbon dioxide, and contribute to acid-base buffering."
  },
  {
    type: "mcq-single", category: "Biochemistry", subcategory: "Vitamins", difficulty: "Knowledge", time: 60,
    question: "Deficiency of which vitamin can lead to scurvy?",
    options: ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin K"],
    correct: ["B"], rationale: "Vitamin C deficiency causes scurvy."
  }
];

const letters = ["A", "B", "C", "D", "E"];
const escapeStr = (str) => str.replace(/'/g, "''");

const insertStatements = data.map((q) => {
  const optionsJson = q.options.map((optText, index) => {
    return {
      letter: letters[index],
      text: optText,
      correct: q.correct.includes(letters[index])
    };
  });

  return `INSERT INTO questions (category, subcategory, type, difficulty, stem, options, rationale, is_published, group_type, marking_scheme) VALUES ('${escapeStr(q.category)}', '${escapeStr(q.subcategory)}', '${q.type}', '${q.difficulty}', '${escapeStr(q.question)}', '${escapeStr(JSON.stringify(optionsJson))}'::jsonb, '${escapeStr(q.rationale)}', true, 'ungrouped', 'zero-one');`;
});

fs.writeFileSync('insert_questions.sql', insertStatements.join('\n'));
console.log("Created insert_questions.sql");
