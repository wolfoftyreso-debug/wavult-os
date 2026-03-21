-- ---------------------------------------------------------------------------
-- Module 13: ISO Compliance Seed
-- ISO 9001:2015 (all clauses) + ISO 27001:2022 (all Annex A controls)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_iso9001_id UUID := 'a1000000-0000-0000-0000-000000000001';
  v_iso27001_id UUID := 'a1000000-0000-0000-0000-000000000002';
BEGIN
  -- Standards
  INSERT INTO compliance_standards (id, code, name, version) VALUES
    (v_iso9001_id, 'ISO 9001', 'Quality Management Systems - Requirements', '2015'),
    (v_iso27001_id, 'ISO 27001', 'Information Security Management Systems - Requirements', '2022')
  ON CONFLICT DO NOTHING;

  -- -----------------------------------------------------------------------
  -- ISO 9001:2015 Requirements
  -- -----------------------------------------------------------------------

  -- Clause 4 — Context
  INSERT INTO compliance_requirements (id, standard_id, clause, title, description, category, status) VALUES
    (gen_random_uuid(), v_iso9001_id, '4.1', 'Understanding the organization and its context', 'Determine external and internal issues relevant to its purpose and strategic direction that affect its ability to achieve intended results.', 'CONTEXT', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '4.2', 'Understanding the needs and expectations of interested parties', 'Determine interested parties relevant to the QMS and their relevant requirements.', 'CONTEXT', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '4.3', 'Determining the scope of the QMS', 'Determine the boundaries and applicability of the QMS to establish its scope.', 'CONTEXT', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '4.4.1', 'QMS and its processes — General', 'Establish, implement, maintain and continually improve the QMS, including the processes needed.', 'CONTEXT', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '4.4.2', 'QMS and its processes — Documented information', 'Maintain documented information to support the operation of processes and retain documented information to have confidence processes are being carried out as planned.', 'CONTEXT', 'NOT_STARTED')
  ON CONFLICT DO NOTHING;

  -- Clause 5 — Leadership
  INSERT INTO compliance_requirements (id, standard_id, clause, title, description, category, status) VALUES
    (gen_random_uuid(), v_iso9001_id, '5.1.1', 'Leadership and commitment — General', 'Top management shall demonstrate leadership and commitment with respect to the QMS.', 'LEADERSHIP', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '5.1.2', 'Leadership and commitment — Customer focus', 'Top management shall demonstrate leadership and commitment with respect to customer focus.', 'LEADERSHIP', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '5.2.1', 'Quality policy — Establishing', 'Top management shall establish, implement and maintain a quality policy.', 'LEADERSHIP', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '5.2.2', 'Quality policy — Communicating', 'The quality policy shall be available as documented information and communicated within the organization.', 'LEADERSHIP', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '5.3', 'Organizational roles, responsibilities and authorities', 'Top management shall ensure that responsibilities and authorities for relevant roles are assigned, communicated and understood.', 'LEADERSHIP', 'NOT_STARTED')
  ON CONFLICT DO NOTHING;

  -- Clause 6 — Planning
  INSERT INTO compliance_requirements (id, standard_id, clause, title, description, category, status) VALUES
    (gen_random_uuid(), v_iso9001_id, '6.1.1', 'Actions to address risks and opportunities — Determining', 'Determine the risks and opportunities that need to be addressed to assure the QMS can achieve its intended results.', 'PLANNING', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '6.1.2', 'Actions to address risks and opportunities — Planning', 'Plan actions to address risks and opportunities, how to integrate into QMS processes, and evaluate effectiveness.', 'PLANNING', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '6.2.1', 'Quality objectives — Establishing', 'Establish quality objectives at relevant functions, levels and processes needed for the QMS.', 'PLANNING', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '6.2.2', 'Quality objectives — Planning', 'Determine what will be done, what resources, who is responsible, completion timeframe, how results are evaluated.', 'PLANNING', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '6.3', 'Planning of changes', 'Determine need for changes to QMS. Carry out changes in a planned and systematic manner.', 'PLANNING', 'NOT_STARTED')
  ON CONFLICT DO NOTHING;

  -- Clause 7 — Support
  INSERT INTO compliance_requirements (id, standard_id, clause, title, description, category, status) VALUES
    (gen_random_uuid(), v_iso9001_id, '7.1.1', 'Resources — General', 'Determine and provide resources needed for the establishment, implementation, maintenance and continual improvement of the QMS.', 'SUPPORT', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '7.1.2', 'Resources — People', 'Determine and provide the persons necessary for the effective implementation of its QMS and for the operation and control of its processes.', 'SUPPORT', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '7.1.3', 'Resources — Infrastructure', 'Determine, provide and maintain the infrastructure necessary for the operation of its processes.', 'SUPPORT', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '7.1.4', 'Resources — Environment for the operation of processes', 'Determine, provide and maintain the environment necessary for the operation of its processes.', 'SUPPORT', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '7.1.5.1', 'Monitoring and measuring resources — General', 'Determine and provide resources needed to ensure valid and reliable results when monitoring/measuring used to verify product/service conformity.', 'SUPPORT', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '7.1.5.2', 'Monitoring and measuring resources — Measurement traceability', 'Measuring equipment shall be calibrated or verified at specified intervals or prior to use, identified, safeguarded, and documented.', 'SUPPORT', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '7.1.6', 'Organizational knowledge', 'Determine knowledge necessary for the operation of its processes and achievement of conformity of products/services.', 'SUPPORT', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '7.2', 'Competence', 'Determine necessary competence of persons doing work that affects the performance and effectiveness of the QMS.', 'SUPPORT', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '7.3', 'Awareness', 'Persons doing work under the organization''s control shall be aware of the quality policy, objectives, and their contribution.', 'SUPPORT', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '7.4', 'Communication', 'Determine internal and external communications relevant to the QMS.', 'SUPPORT', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '7.5.1', 'Documented information — General', 'Organization''s QMS shall include documented information required by this standard and determined as necessary.', 'SUPPORT', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '7.5.2', 'Documented information — Creating and updating', 'Ensure appropriate identification, format, review and approval of documented information.', 'SUPPORT', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '7.5.3', 'Documented information — Control', 'Documented information required by the QMS and this standard shall be controlled to ensure availability and protection.', 'SUPPORT', 'NOT_STARTED')
  ON CONFLICT DO NOTHING;

  -- Clause 8 — Operation
  INSERT INTO compliance_requirements (id, standard_id, clause, title, description, category, status) VALUES
    (gen_random_uuid(), v_iso9001_id, '8.1', 'Operational planning and control', 'Plan, implement, control, maintain and retain documented information necessary to ensure products/services conform to requirements.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.2.1', 'Customer communication', 'Communication with customers relating to product/service information, enquiries, contracts, feedback and complaints.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.2.2', 'Determining requirements for products and services', 'Determine requirements for products/services to be offered including legal/regulatory requirements.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.2.3', 'Review of requirements for products and services', 'Ensure organization has the ability to meet requirements before committing to supply.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.2.4', 'Changes to requirements for products and services', 'Ensure relevant documented information is amended and relevant persons made aware of changed requirements.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.3.1', 'Design and development — General', 'Establish, implement and maintain a design and development process.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.3.2', 'Design and development planning', 'Determine stages and controls for design and development.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.3.3', 'Design and development inputs', 'Determine requirements essential for the specific types of products/services to be designed and developed.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.3.4', 'Design and development controls', 'Apply controls to design and development process to ensure results are defined and reviews/verification/validation are conducted.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.3.5', 'Design and development outputs', 'Ensure outputs meet input requirements, are adequate for subsequent processes, include monitoring/measuring requirements.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.3.6', 'Design and development changes', 'Identify, review and control changes made during or subsequent to the design and development of products/services.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.4.1', 'Control of externally provided processes — General', 'Ensure externally provided processes, products and services conform to requirements.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.4.2', 'Type and extent of control', 'Determine the controls to be applied to externally provided processes, products and services based on potential impact.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.4.3', 'Information for external providers', 'Communicate requirements for processes, products and services to be provided and the control and monitoring of the provider''s performance.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.5.1', 'Production and service provision — Control', 'Implement production and service provision under controlled conditions including documented information, suitable resources, monitoring/measuring.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.5.2', 'Identification and traceability', 'Use suitable means to identify outputs when it is necessary to ensure conformity.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.5.3', 'Property belonging to customers or external providers', 'Exercise care with property belonging to customers or external providers while under the organization''s control.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.5.4', 'Preservation', 'Preserve outputs during production and service provision to ensure conformity to requirements.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.5.5', 'Post-delivery activities', 'Meet requirements for post-delivery activities associated with products/services.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.5.6', 'Control of changes', 'Review and control changes for production or service provision to ensure continuing conformity.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.6', 'Release of products and services', 'Implement planned arrangements at appropriate stages to verify product/service requirements have been met.', 'OPERATION', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '8.7', 'Control of nonconforming outputs', 'Ensure outputs that do not conform to their requirements are identified and controlled.', 'OPERATION', 'NOT_STARTED')
  ON CONFLICT DO NOTHING;

  -- Clause 9 — Performance evaluation
  INSERT INTO compliance_requirements (id, standard_id, clause, title, description, category, status) VALUES
    (gen_random_uuid(), v_iso9001_id, '9.1.1', 'Monitoring, measurement, analysis — General', 'Determine what needs to be monitored/measured, methods, when analysis shall be performed.', 'PERFORMANCE', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '9.1.2', 'Customer satisfaction', 'Monitor customers'' perceptions of the degree to which their needs and expectations have been fulfilled.', 'PERFORMANCE', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '9.1.3', 'Analysis and evaluation', 'Analyse and evaluate appropriate data and information arising from monitoring and measurement.', 'PERFORMANCE', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '9.2.1', 'Internal audit — General', 'Conduct internal audits at planned intervals to provide information on whether the QMS conforms to requirements.', 'PERFORMANCE', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '9.2.2', 'Internal audit programme', 'Plan, establish, implement and maintain an audit programme.', 'PERFORMANCE', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '9.3.1', 'Management review — General', 'Top management shall review the organization''s QMS at planned intervals.', 'PERFORMANCE', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '9.3.2', 'Management review inputs', 'Management review shall be planned and carried out taking into consideration defined inputs.', 'PERFORMANCE', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '9.3.3', 'Management review outputs', 'Outputs of the management review shall include decisions and actions related to improvement opportunities.', 'PERFORMANCE', 'NOT_STARTED')
  ON CONFLICT DO NOTHING;

  -- Clause 10 — Improvement
  INSERT INTO compliance_requirements (id, standard_id, clause, title, description, category, status) VALUES
    (gen_random_uuid(), v_iso9001_id, '10.1', 'Improvement — General', 'Determine and select opportunities for improvement and implement necessary actions to meet customer requirements.', 'IMPROVEMENT', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '10.2.1', 'Nonconformity and corrective action', 'React to nonconformity, take action to control/correct, evaluate the need for action to eliminate causes.', 'IMPROVEMENT', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '10.2.2', 'Nonconformity records', 'Retain documented information as evidence of nature of nonconformities and subsequent actions taken.', 'IMPROVEMENT', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso9001_id, '10.3', 'Continual improvement', 'Continually improve the suitability, adequacy and effectiveness of the QMS.', 'IMPROVEMENT', 'NOT_STARTED')
  ON CONFLICT DO NOTHING;

  -- -----------------------------------------------------------------------
  -- ISO 27001:2022 Annex A Controls
  -- -----------------------------------------------------------------------

  -- A.5 Organizational controls
  INSERT INTO compliance_requirements (id, standard_id, clause, title, description, category, status) VALUES
    (gen_random_uuid(), v_iso27001_id, 'A.5.1', 'Policies for information security', 'Information security policy and topic-specific policies shall be defined, approved by management, published, communicated and acknowledged by relevant personnel.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.2', 'Information security roles and responsibilities', 'Information security roles and responsibilities shall be defined and allocated.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.3', 'Segregation of duties', 'Conflicting duties and areas of responsibility shall be segregated.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.4', 'Management responsibilities', 'Management shall require all personnel to apply information security in accordance with the established policy.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.5', 'Contact with authorities', 'Maintain appropriate contacts with relevant authorities.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.6', 'Contact with special interest groups', 'Maintain appropriate contacts with special interest groups or other specialist security forums.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.7', 'Threat intelligence', 'Information relating to information security threats shall be collected and analysed to produce threat intelligence.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.8', 'Information security in project management', 'Information security shall be integrated into project management.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.9', 'Inventory of information and other associated assets', 'An inventory of information and associated assets shall be developed and maintained.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.10', 'Acceptable use of information and other associated assets', 'Rules for acceptable use and handling of information and associated assets shall be identified, documented and implemented.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.11', 'Return of assets', 'Personnel and other interested parties shall return all the organization''s assets upon change or termination of employment.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.12', 'Classification of information', 'Information shall be classified according to the information security needs of the organization.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.13', 'Labelling of information', 'An appropriate set of procedures for information labelling shall be developed and implemented.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.14', 'Information transfer', 'Information transfer rules, procedures and agreements shall be in place for all types of transfer facilities.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.15', 'Access control', 'Rules to control physical and logical access to information and assets shall be established and implemented.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.16', 'Identity management', 'The full life cycle of identities shall be managed.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.17', 'Authentication information', 'Allocation and management of authentication information shall be controlled by a management process.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.18', 'Access rights', 'Access rights to information and assets shall be provisioned, reviewed, modified and removed in accordance with the access control policy.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.19', 'Information security in supplier relationships', 'Processes and procedures shall be defined and implemented to manage information security risks associated with the use of supplier''s products/services.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.20', 'Addressing information security within supplier agreements', 'Relevant information security requirements shall be established and agreed with each supplier.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.21', 'Managing information security in the ICT supply chain', 'Processes and procedures shall be defined and implemented to manage information security risks associated with the ICT products and services supply chain.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.22', 'Monitoring, review and change management of supplier services', 'The organization shall regularly monitor, review, evaluate and manage change in supplier information security practices.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.23', 'Information security for use of cloud services', 'Processes for acquisition, use, management and exit from cloud services shall be established.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.24', 'Information security incident management planning and preparation', 'Responsibilities and procedures for management of information security incidents shall be established.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.25', 'Assessment and decision on information security events', 'Assess information security events and decide if they are classified as information security incidents.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.26', 'Response to information security incidents', 'Information security incidents shall be responded to in accordance with documented procedures.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.27', 'Learning from information security incidents', 'Knowledge gained from information security incidents shall be used to strengthen and improve the controls.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.28', 'Collection of evidence', 'The organization shall establish and implement procedures for identification, collection, acquisition and preservation of evidence.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.29', 'Information security during disruption', 'Plan how to maintain information security at an appropriate level during disruption.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.30', 'ICT readiness for business continuity', 'ICT readiness shall be planned, implemented, maintained and tested based on business continuity objectives.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.31', 'Legal, statutory, regulatory and contractual requirements', 'Identify and document legislative, statutory, regulatory and contractual requirements relevant to information security.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.32', 'Intellectual property rights', 'Implement procedures to protect intellectual property rights.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.33', 'Protection of records', 'Records shall be protected from loss, destruction, falsification, unauthorized access and unauthorized release.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.34', 'Privacy and protection of PII', 'Identify and meet the requirements regarding the preservation of privacy and protection of personally identifiable information.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.35', 'Independent review of information security', 'The organization''s approach to managing information security shall be reviewed independently at planned intervals.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.36', 'Compliance with policies and standards for information security', 'Compliance with the organization''s information security policy, topic-specific policies and standards shall be regularly reviewed.', 'ORGANIZATIONAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.5.37', 'Documented operating procedures', 'Operating procedures for information processing facilities shall be documented and made available to personnel who need them.', 'ORGANIZATIONAL', 'NOT_STARTED')
  ON CONFLICT DO NOTHING;

  -- A.6 People controls
  INSERT INTO compliance_requirements (id, standard_id, clause, title, description, category, status) VALUES
    (gen_random_uuid(), v_iso27001_id, 'A.6.1', 'Screening', 'Background verification checks on all candidates for employment shall be carried out prior to joining.', 'PEOPLE', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.6.2', 'Terms and conditions of employment', 'Employment contractual agreements shall state personnel and organization responsibilities for information security.', 'PEOPLE', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.6.3', 'Information security awareness, education and training', 'Personnel shall receive appropriate security awareness education and training relevant to their role.', 'PEOPLE', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.6.4', 'Disciplinary process', 'A disciplinary process shall be formalized and communicated to take actions against personnel who have committed a policy violation.', 'PEOPLE', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.6.5', 'Responsibilities after termination or change of employment', 'Information security responsibilities and duties that remain valid after termination or change shall be defined.', 'PEOPLE', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.6.6', 'Confidentiality or non-disclosure agreements', 'Confidentiality or non-disclosure agreements reflecting the organization''s needs for protection of information shall be identified and reviewed.', 'PEOPLE', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.6.7', 'Remote working', 'Security measures shall be implemented when personnel are working remotely.', 'PEOPLE', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.6.8', 'Information security event reporting', 'Provide a mechanism for personnel to report observed or suspected information security events.', 'PEOPLE', 'NOT_STARTED')
  ON CONFLICT DO NOTHING;

  -- A.7 Physical controls
  INSERT INTO compliance_requirements (id, standard_id, clause, title, description, category, status) VALUES
    (gen_random_uuid(), v_iso27001_id, 'A.7.1', 'Physical security perimeters', 'Security perimeters shall be defined and used to protect areas that contain information and associated assets.', 'PHYSICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.7.2', 'Physical entry', 'Secure areas shall be protected by appropriate entry controls to ensure only authorized personnel are allowed access.', 'PHYSICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.7.3', 'Securing offices, rooms and facilities', 'Physical security for offices, rooms and facilities shall be designed and implemented.', 'PHYSICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.7.4', 'Physical security monitoring', 'Premises shall be continuously monitored for unauthorized physical access.', 'PHYSICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.7.5', 'Protecting against physical and environmental threats', 'Protection against physical and environmental threats, such as natural disasters, shall be designed and implemented.', 'PHYSICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.7.6', 'Working in secure areas', 'Security measures for working in secure areas shall be designed and implemented.', 'PHYSICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.7.7', 'Clear desk and clear screen', 'Clear desk rules for papers and removable storage media and clear screen rules for information processing facilities shall be defined and enforced.', 'PHYSICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.7.8', 'Equipment siting and protection', 'Equipment shall be sited securely and protected.', 'PHYSICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.7.9', 'Security of assets off-premises', 'Off-site assets shall be protected.', 'PHYSICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.7.10', 'Storage media', 'Storage media shall be managed through its life cycle of acquisition, use, transportation and disposal.', 'PHYSICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.7.11', 'Supporting utilities', 'Information processing facilities shall be protected from power failures and other disruptions caused by failures in supporting utilities.', 'PHYSICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.7.12', 'Cabling security', 'Cables carrying power, data or supporting information services shall be protected from interception, interference or damage.', 'PHYSICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.7.13', 'Equipment maintenance', 'Equipment shall be maintained correctly to ensure availability, integrity and confidentiality of information.', 'PHYSICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.7.14', 'Secure disposal or re-use of equipment', 'Items of equipment containing storage media shall be verified to ensure that any sensitive data has been removed.', 'PHYSICAL', 'NOT_STARTED')
  ON CONFLICT DO NOTHING;

  -- A.8 Technological controls
  INSERT INTO compliance_requirements (id, standard_id, clause, title, description, category, status) VALUES
    (gen_random_uuid(), v_iso27001_id, 'A.8.1', 'User end point devices', 'Information stored on, processed by or accessible via user end point devices shall be protected.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.2', 'Privileged access rights', 'Allocation and use of privileged access rights shall be restricted and managed.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.3', 'Information access restriction', 'Access to information and associated assets shall be restricted in accordance with the access control policy.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.4', 'Access to source code', 'Read and write access to source code, development tools and software libraries shall be appropriately managed.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.5', 'Secure authentication', 'Secure authentication technologies and procedures shall be implemented based on information access restrictions.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.6', 'Capacity management', 'The use of resources shall be monitored and adjusted in line with current and expected capacity requirements.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.7', 'Protection against malware', 'Protection against malware shall be implemented and supported by appropriate user awareness.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.8', 'Management of technical vulnerabilities', 'Information about technical vulnerabilities of information systems in use shall be obtained.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.9', 'Configuration management', 'Configurations, including security configurations, of hardware, software, services and networks shall be established, documented, implemented, monitored and reviewed.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.10', 'Information deletion', 'Information stored in information systems, devices or in any other storage media shall be deleted when no longer required.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.11', 'Data masking', 'Data masking shall be used in accordance with the organization''s topic-specific policy on access control and other related policies.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.12', 'Data leakage prevention', 'Data leakage prevention measures shall be applied to systems, networks and any other devices that process, store or transmit sensitive information.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.13', 'Information backup', 'Backup copies of information, software and systems shall be maintained and regularly tested.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.14', 'Redundancy of information processing facilities', 'Information processing facilities shall be implemented with redundancy sufficient to meet availability requirements.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.15', 'Logging', 'Logs that record activities, exceptions, faults and other relevant events shall be produced, stored, protected and analysed.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.16', 'Monitoring activities', 'Networks, systems and applications shall be monitored for anomalous behaviour and appropriate actions taken.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.17', 'Clock synchronisation', 'The clocks of information processing systems used by the organization shall be synchronized.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.18', 'Use of privileged utility programs', 'The use of utility programs that might be capable of overriding system and application controls shall be restricted and tightly controlled.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.19', 'Installation of software on operational systems', 'Procedures and measures shall be implemented to securely manage software installation on operational systems.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.20', 'Networks security', 'Networks and network devices shall be secured, managed and controlled to protect information in systems and applications.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.21', 'Security of network services', 'Security mechanisms, service levels and requirements of network services shall be identified, implemented and monitored.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.22', 'Segregation of networks', 'Groups of information services, users and information systems shall be segregated in the organization''s networks.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.23', 'Web filtering', 'Access to external websites shall be managed to reduce exposure to malicious content.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.24', 'Use of cryptography', 'Rules for the effective use of cryptography, including cryptographic key management, shall be defined and implemented.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.25', 'Secure development life cycle', 'Rules for the secure development of software and systems shall be established and applied.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.26', 'Application security requirements', 'Information security requirements shall be identified, specified and approved when developing or acquiring applications.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.27', 'Secure system architecture and engineering principles', 'Principles for engineering secure systems shall be established, documented, maintained and applied.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.28', 'Secure coding', 'Secure coding principles shall be applied to software development.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.29', 'Security testing in development and acceptance', 'Security testing processes shall be defined and implemented in the development life cycle.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.30', 'Outsourced development', 'The organization shall direct, monitor and review the activities related to outsourced system development.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.31', 'Separation of development, test and production environments', 'Development, testing and production environments shall be separated and secured.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.32', 'Change management', 'Changes to information processing facilities and information systems shall be subject to change management procedures.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.33', 'Test information', 'Test information shall be appropriately selected, protected and managed.', 'TECHNOLOGICAL', 'NOT_STARTED'),
    (gen_random_uuid(), v_iso27001_id, 'A.8.34', 'Protection of information systems during audit testing', 'Audit tests and other assurance activities involving assessment of operational systems shall be planned and agreed.', 'TECHNOLOGICAL', 'NOT_STARTED')
  ON CONFLICT DO NOTHING;

EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'compliance tables not found, skipping ISO 27001 seed';
END $$;
