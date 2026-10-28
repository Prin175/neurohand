// NeuroHand language support (English / Thai).
// English is written in the pages. When Thai is chosen in Settings, every text node,
// label and title is translated here, including text the app updates while it runs.
(function () {
  'use strict';
  let lang = 'en';
  try { lang = localStorage.getItem('nh.lang') === 'th' ? 'th' : 'en'; } catch (e) { /* storage unavailable */ }
  window.NH = window.NH || {};
  window.NH.lang = lang;
  const root = document.documentElement;
  if (lang !== 'th') { root.classList.remove('nh-i18n-wait'); return; }
  root.lang = 'th';

  // ---------- Dates ----------
  const DAYS = { Monday: 'วันจันทร์', Tuesday: 'วันอังคาร', Wednesday: 'วันพุธ', Thursday: 'วันพฤหัสบดี', Friday: 'วันศุกร์', Saturday: 'วันเสาร์', Sunday: 'วันอาทิตย์',
    Mon: 'จ.', Tue: 'อ.', Wed: 'พ.', Thu: 'พฤ.', Fri: 'ศ.', Sat: 'ส.', Sun: 'อา.' };
  const MONTHS = { January: 'มกราคม', February: 'กุมภาพันธ์', March: 'มีนาคม', April: 'เมษายน', May: 'พฤษภาคม', June: 'มิถุนายน', July: 'กรกฎาคม', August: 'สิงหาคม', September: 'กันยายน', October: 'ตุลาคม', November: 'พฤศจิกายน', December: 'ธันวาคม',
    Jan: 'ม.ค.', Feb: 'ก.พ.', Mar: 'มี.ค.', Apr: 'เม.ย.', Jun: 'มิ.ย.', Jul: 'ก.ค.', Aug: 'ส.ค.', Sep: 'ก.ย.', Oct: 'ต.ค.', Nov: 'พ.ย.', Dec: 'ธ.ค.' };
  const TOK = '(?:' + Object.keys(DAYS).concat(Object.keys(MONTHS)).sort((a, b) => b.length - a.length).join('|') + ')';
  const DATE_ONLY = new RegExp('^(?:[\\s\\d,.:·–-]*\\b' + TOK + '\\b)+[\\s\\d,.:·–-]*$');
  const dateTh = (s) => s.replace(new RegExp('\\b' + TOK + '\\b', 'g'), (w) => DAYS[w] || MONTHS[w]);

  // ---------- Exact strings ----------
  const D = {
    // Brand and navigation
    'NeuroHand': 'NeuroHand', 'Home': 'หน้าแรก', 'Training': 'ฝึก', 'My plan': 'แผนของฉัน', 'Progress': 'ความก้าวหน้า', 'Device': 'อุปกรณ์',
    'Signal monitor': 'ดูสัญญาณ', 'Soon': 'เร็วๆ นี้', 'Settings': 'ตั้งค่า', 'Log out': 'ออกจากระบบ', 'Log in': 'เข้าสู่ระบบ', 'Sign up': 'สมัครสมาชิก',
    'About': 'เกี่ยวกับ', 'How it works': 'วิธีการทำงาน', 'Research': 'งานวิจัย', 'Contact': 'ติดต่อ', 'Menu': 'เมนู', 'Main': 'เมนูหลัก', 'Footer': 'ส่วนท้าย',
    'App navigation': 'เมนูแอป', 'Open navigation': 'เปิดเมนู', 'Back to home': 'กลับหน้าแรก', 'Back to Home': 'กลับหน้าแรก', 'Go to Home': 'ไปหน้าแรก',
    // Page titles
    'Home · NeuroHand': 'หน้าแรก · NeuroHand', 'Training · NeuroHand': 'ฝึก · NeuroHand', 'My plan · NeuroHand': 'แผนของฉัน · NeuroHand',
    'Progress · NeuroHand': 'ความก้าวหน้า · NeuroHand', 'Device · NeuroHand': 'อุปกรณ์ · NeuroHand', 'Settings · NeuroHand': 'ตั้งค่า · NeuroHand',
    'Log in · NeuroHand': 'เข้าสู่ระบบ · NeuroHand', 'Sign up · NeuroHand': 'สมัครสมาชิก · NeuroHand', 'Beginner guide · NeuroHand': 'คู่มือเริ่มต้น · NeuroHand',
    'NeuroHand Website': 'NeuroHand',
    // Landing page
    'Train your hand by imagining the movement.': 'ฝึกมือด้วยการจินตนาการการเคลื่อนไหว',
    'NeuroHand records EEG while you imagine moving your left or right hand. When the signal is recognized, a virtual hand on screen moves with you. It is a student research project exploring visual feedback for stroke rehabilitation.':
      'NeuroHand บันทึกคลื่นสมอง (EEG) ขณะที่คุณจินตนาการว่าขยับมือซ้ายหรือขวา เมื่อระบบตรวจจับสัญญาณได้ มือเสมือนบนหน้าจอจะขยับตามคุณ เป็นโครงงานวิจัยของนักศึกษาที่ศึกษาการให้ผลตอบกลับทางภาพเพื่อฟื้นฟูผู้ป่วยโรคหลอดเลือดสมอง',
    'Create an account': 'สร้างบัญชี', 'The current prototype uses simulated EEG data.': 'ต้นแบบนี้ใช้ข้อมูล EEG จำลอง',
    '[Photo: participant wearing the EEG headset during a training session]': '[รูปภาพ: ผู้เข้าร่วมสวมเฮดเซ็ต EEG ระหว่างการฝึก]',
    'Replace with a photo from your own testing.': 'แทนที่ด้วยรูปจากการทดสอบของคุณ',
    'Connect the headset': 'เชื่อมต่อเฮดเซ็ต', 'Pair your EEG headset with the app before each session.': 'จับคู่เฮดเซ็ต EEG กับแอปก่อนเริ่มทุกเซสชัน',
    'Imagine the movement': 'จินตนาการการเคลื่อนไหว', 'Follow the cue and imagine closing your left or right hand.': 'ทำตามสัญญาณบอก แล้วจินตนาการว่ากำมือซ้ายหรือขวา',
    'See the feedback': 'ดูผลตอบกลับ', 'The virtual hand moves when your signal is recognized.': 'มือเสมือนจะขยับเมื่อระบบตรวจจับสัญญาณของคุณได้',
    'A student project on brain-computer interfaces': 'โครงงานนักศึกษาด้านส่วนต่อประสานสมองกับคอมพิวเตอร์',
    'After a stroke, many people lose movement in one hand. Imagining a movement activates many of the same motor areas as making it. NeuroHand asks whether showing that activity as a moving hand makes imagery practice more engaging.':
      'หลังเป็นโรคหลอดเลือดสมอง หลายคนขยับมือข้างหนึ่งได้น้อยลง การจินตนาการการเคลื่อนไหวกระตุ้นสมองส่วนสั่งการหลายส่วนเหมือนกับการขยับจริง NeuroHand ศึกษาว่าการแสดงกิจกรรมนั้นเป็นมือที่ขยับได้ จะทำให้การฝึกจินตนาการน่าสนใจขึ้นหรือไม่',
    'NeuroHand is not a medical device.': 'NeuroHand ไม่ใช่อุปกรณ์ทางการแพทย์', 'It is a research prototype.': 'เป็นต้นแบบเพื่อการวิจัย',
    'Motor imagery with visual feedback': 'การจินตนาการการเคลื่อนไหวพร้อมผลตอบกลับทางภาพ',
    'Imagining a hand movement reduces the 8–12 Hz mu rhythm over the opposite side of the motor cortex. NeuroHand records this over electrodes C3, Cz and C4 and turns it into feedback on screen.':
      'การจินตนาการว่าขยับมือทำให้คลื่นมิว (8–12 Hz) ลดลงที่สมองส่วนสั่งการฝั่งตรงข้าม NeuroHand บันทึกสัญญาณนี้จากขั้วไฟฟ้า C3, Cz และ C4 แล้วแสดงเป็นผลตอบกลับบนหน้าจอ',
    'The current phase tests the interface with simulated data. Sessions with volunteers will only start after ethics approval.':
      'ระยะนี้ทดสอบหน้าจอด้วยข้อมูลจำลอง การทดลองกับอาสาสมัครจะเริ่มหลังได้รับอนุมัติด้านจริยธรรมเท่านั้น',
    'Get in touch': 'ติดต่อเรา', 'Interested in taking part or collaborating? Email the project team at': 'สนใจเข้าร่วมหรือร่วมมือกับเรา? อีเมลหาทีมได้ที่',
    "Replace with your team's email address.": 'แทนที่ด้วยอีเมลของทีมคุณ',
    'NeuroHand is a student research prototype, not a medical device.': 'NeuroHand เป็นต้นแบบงานวิจัยของนักศึกษา ไม่ใช่อุปกรณ์ทางการแพทย์',
    // Login
    'New to NeuroHand?': 'เพิ่งเริ่มใช้ NeuroHand?', 'Already have an account?': 'มีบัญชีอยู่แล้ว?', 'I am a': 'ฉันเป็น',
    'Patient': 'ผู้ป่วย', 'Do training sessions and see my progress': 'ฝึกและดูความก้าวหน้าของฉัน',
    'Researcher': 'นักวิจัย', 'Manage devices and monitor EEG signals': 'จัดการอุปกรณ์และดูสัญญาณ EEG',
    'Full name': 'ชื่อ-นามสกุล', 'Email': 'อีเมล', 'Password': 'รหัสผ่าน', 'Forgot password?': 'ลืมรหัสผ่าน?', 'Create account': 'สร้างบัญชี',
    'Enter your full name.': 'กรอกชื่อ-นามสกุล', 'Enter a valid email address, like name@example.com.': 'กรอกอีเมลให้ถูกต้อง เช่น name@example.com',
    'Enter your password.': 'กรอกรหัสผ่าน', 'Password reset is not set up yet. Ask your research team for help.': 'ยังรีเซ็ตรหัสผ่านไม่ได้ กรุณาติดต่อทีมวิจัย',
    // Beginner guide
    'Beginner guide': 'คู่มือเริ่มต้น', 'Skip for now': 'ข้ามไปก่อน', 'Back': 'ย้อนกลับ', 'Next': 'ถัดไป', 'Finish and go to Home': 'เสร็จสิ้นและไปหน้าแรก',
    'Welcome to NeuroHand': 'ยินดีต้อนรับสู่ NeuroHand',
    'Imagine moving your hand. When NeuroHand recognizes it, a virtual hand moves on screen.': 'จินตนาการว่าขยับมือ เมื่อ NeuroHand ตรวจจับได้ มือเสมือนบนหน้าจอจะขยับ',
    'This guide takes about 5 minutes.': 'คู่มือนี้ใช้เวลาประมาณ 5 นาที', 'Your plan grows from your own results.': 'แผนของคุณปรับตามผลของคุณเอง',
    'Not a medical device. If you have a medical condition, ask a healthcare professional first.': 'ไม่ใช่อุปกรณ์ทางการแพทย์ หากคุณมีโรคประจำตัว ควรปรึกษาบุคลากรทางการแพทย์ก่อน',
    'Imagine, don’t move': 'จินตนาการ ไม่ต้องขยับ',
    'Each trial asks you to imagine closing your left or right hand for a few seconds.': 'แต่ละครั้งจะให้คุณจินตนาการว่ากำมือซ้ายหรือขวาเป็นเวลาสองสามวินาที',
    'Do': 'ควรทำ', 'Don’t': 'ไม่ควรทำ', 'Feel your fingers squeeze slowly': 'รู้สึกว่านิ้วค่อยๆ กำ', 'Breathe normally': 'หายใจตามปกติ',
    'Move your real hand': 'ขยับมือจริง', 'Strain or hold your breath': 'เกร็งหรือกลั้นหายใจ',
    'Put on the headset': 'สวมเฮดเซ็ต', 'Front': 'ด้านหน้า',
    'Top view of the head showing electrodes C3 on the left, Cz on top and C4 on the right': 'ภาพศีรษะมองจากด้านบน แสดงขั้วไฟฟ้า C3 ด้านซ้าย Cz ตรงกลาง และ C4 ด้านขวา',
    'Charge the headset.': 'ชาร์จเฮดเซ็ต', 'Place C3, Cz and C4 across the top of your head.': 'วาง C3, Cz และ C4 เรียงบนศีรษะ',
    'Move hair so each one touches the scalp.': 'แหวกผมให้ขั้วไฟฟ้าแตะหนังศีรษะ', 'Check the signal on the': 'ตรวจสัญญาณในหน้า', 'page.': '',
    'Stay safe': 'ความปลอดภัย', 'Check in before each session.': 'เช็กอินก่อนทุกเซสชัน', 'Pause or stop anytime.': 'หยุดพักหรือหยุดได้ทุกเมื่อ',
    'Rest between sets.': 'พักระหว่างเซต', 'Never catch up on missed sessions.': 'ไม่ต้องฝึกชดเชยเซสชันที่พลาดไป',
    'Feeling unwell? Contact a healthcare professional.': 'รู้สึกไม่สบาย? ติดต่อบุคลากรทางการแพทย์',
    'Your data': 'ข้อมูลของคุณ', 'NeuroHand saves your results to build your plan:': 'NeuroHand บันทึกผลของคุณเพื่อสร้างแผน:',
    'Recognition for each hand': 'การตรวจจับของมือแต่ละข้าง', 'Session length': 'ระยะเวลาเซสชัน', 'Check-in and signal quality': 'การเช็กอินและคุณภาพสัญญาณ',
    'Saved in this browser. Delete it anytime on': 'บันทึกไว้ในเบราว์เซอร์นี้ ลบได้ทุกเมื่อในหน้า',
    'I agree NeuroHand saves my training results.': 'ฉันยินยอมให้ NeuroHand บันทึกผลการฝึกของฉัน', 'Tick the box to continue.': 'ติ๊กช่องเพื่อไปต่อ',
    'Try a practice round': 'ลองฝึกซ้อม', 'Three quick trials. No score.': 'ลองสั้นๆ 3 ครั้ง ไม่มีคะแนน', 'Ready when you are': 'พร้อมเมื่อคุณพร้อม',
    'Rest your hands on the table.': 'วางมือบนโต๊ะ', 'Start practice': 'เริ่มฝึกซ้อม', 'Practise again': 'ฝึกซ้อมอีกครั้ง',
    'Next: your first session on Home.': 'ถัดไป: เซสชันแรกของคุณที่หน้าแรก', 'Get ready': 'เตรียมตัว',
    'Squeeze slowly. Keep your real hand still.': 'ค่อยๆ กำ มือจริงอยู่นิ่งๆ', 'Now relax.': 'ผ่อนคลายได้', 'Done!': 'เสร็จแล้ว!',
    'In real sessions, the hand moves when your signal is recognized.': 'ในการฝึกจริง มือจะขยับเมื่อระบบตรวจจับสัญญาณของคุณได้',
    'Imagine closing your left hand': 'จินตนาการว่ากำมือซ้าย', 'Imagine closing your right hand': 'จินตนาการว่ากำมือขวา',
    // Home
    'Good evening, P-01': 'สวัสดีตอนเย็น P-01', 'Here’s your plan for today.': 'นี่คือแผนของคุณวันนี้',
    'Daily Training Assistant': 'ผู้ช่วยฝึกประจำวัน', 'Your Training Plan Today': 'แผนการฝึกวันนี้', 'Demo data': 'ข้อมูลตัวอย่าง',
    'How do you feel today?': 'วันนี้คุณรู้สึกอย่างไร?', 'Feeling good': 'รู้สึกดี', 'Full session': 'ฝึกเต็มเซสชัน',
    'A little tired': 'เหนื่อยนิดหน่อย', 'Shorter session': 'ฝึกสั้นลง', 'Feeling uncomfortable': 'รู้สึกไม่สบาย', 'Rest today': 'พักวันนี้',
    'Today’s focus': 'เป้าหมายวันนี้', 'Practice sets': 'จำนวนเซต', 'Rest': 'พัก', 'Between sets': 'ระหว่างเซต', 'One set': '1 เซต',
    'Rest reminders': 'การเตือนให้พัก', 'Stop anytime if tired or uncomfortable': 'หยุดได้ทุกเมื่อหากเหนื่อยหรือไม่สบาย',
    'Why this recommendation?': 'ทำไมถึงแนะนำแบบนี้?', 'Start Today’s Session': 'เริ่มฝึกวันนี้', 'View Weekly Plan': 'ดูแผนรายสัปดาห์',
    'Check in first.': 'เช็กอินก่อน', 'Start beginner guide': 'เริ่มคู่มือเริ่มต้น', 'Explore with demo data': 'ลองใช้ข้อมูลตัวอย่าง',
    'Check the signal': 'ตรวจสัญญาณ', 'Check signal': 'ตรวจสัญญาณ', 'A training suggestion, not medical advice.': 'เป็นคำแนะนำการฝึก ไม่ใช่คำแนะนำทางการแพทย์',
    'This week': 'สัปดาห์นี้', 'Planned sessions': 'เซสชันที่วางแผนไว้', 'Headset': 'เฮดเซ็ต', 'Connected': 'เชื่อมต่อแล้ว',
    'NeuroHand EEG headset · NH-01 · Bluetooth': 'เฮดเซ็ต EEG NeuroHand · NH-01 · บลูทูธ', 'Battery': 'แบตเตอรี่', 'Signal': 'สัญญาณ',
    'Manage device': 'จัดการอุปกรณ์', 'Recent sessions': 'เซสชันล่าสุด', 'See all progress': 'ดูความก้าวหน้าทั้งหมด', 'Session': 'เซสชัน',
    'Date': 'วันที่', 'Recognized': 'ตรวจจับได้', 'Duration': 'ระยะเวลา', 'No sessions yet.': 'ยังไม่มีเซสชัน', 'No sessions yet': 'ยังไม่มีเซสชัน',
    'Recognition is not a measure of physical recovery.': 'ผลการตรวจจับไม่ใช่ตัววัดการฟื้นตัวของร่างกาย',
    'Not a measure of physical recovery.': 'ไม่ใช่ตัววัดการฟื้นตัวของร่างกาย',
    'EEG headset': 'เฮดเซ็ต EEG', 'Participant P-01': 'ผู้เข้าร่วม P-01', 'Good': 'ดี', 'good': 'ดี', 'fair': 'พอใช้', 'poor': 'ไม่ดี',
    'Fair': 'พอใช้', 'Poor': 'ไม่ดี', 'Electrodes: C3': 'ขั้วไฟฟ้า: C3',
    // Recommendation text
    'Start with a 5-minute beginner guide.': 'เริ่มด้วยคู่มือเริ่มต้น 5 นาที', 'Rest is the right choice today.': 'วันนี้ควรพัก',
    'You feel uncomfortable, so no training today.': 'คุณรู้สึกไม่สบาย วันนี้จึงไม่ฝึก',
    'If it continues or worries you, contact a healthcare professional.': 'หากยังเป็นอยู่หรือกังวล ให้ติดต่อบุคลากรทางการแพทย์',
    'Done for today': 'วันนี้เสร็จแล้ว', 'You stopped early': 'คุณหยุดก่อนกำหนด', 'That’s fine. Rest for today.': 'ไม่เป็นไร พักได้เลยวันนี้',
    'Well done. Rest for today.': 'เยี่ยมมาก พักได้เลยวันนี้', 'One session per day.': 'วันละหนึ่งเซสชัน', 'Rest day': 'วันพัก',
    'Rest days are part of training.': 'วันพักก็เป็นส่วนหนึ่งของการฝึก', 'Your plan stays within fixed safety limits.': 'แผนของคุณอยู่ในขีดจำกัดความปลอดภัยเสมอ',
    'Starting check': 'ทดสอบเริ่มต้น', 'A short, easy session to find your starting point.': 'เซสชันสั้นๆ ง่ายๆ เพื่อหาจุดเริ่มต้นของคุณ',
    'Left hand': 'มือซ้าย', 'Right hand': 'มือขวา', 'Both hands': 'ทั้งสองมือ', 'Equal left and right': 'ซ้ายและขวาเท่ากัน',
    'More left-hand trials': 'ฝึกมือซ้ายมากขึ้น', 'More right-hand trials': 'ฝึกมือขวามากขึ้น', 'Both hands are about even.': 'ทั้งสองมือใกล้เคียงกัน',
    'Your left hand was recognized less often, so it gets more practice.': 'มือซ้ายถูกตรวจจับได้น้อยกว่า จึงได้ฝึกมากขึ้น',
    'Your right hand was recognized less often, so it gets more practice.': 'มือขวาถูกตรวจจับได้น้อยกว่า จึงได้ฝึกมากขึ้น',
    'Shorter today because you’re tired.': 'วันนี้ฝึกสั้นลงเพราะคุณเหนื่อย', 'You feel good: full session.': 'คุณรู้สึกดี: ฝึกเต็มเซสชัน',
    'Check in to start.': 'เช็กอินเพื่อเริ่ม', 'Poor signal makes results unreliable, so they won’t count.': 'สัญญาณไม่ดีทำให้ผลไม่น่าเชื่อถือ จึงไม่นำมานับ',
    'Recognition is not physical recovery. This is a training suggestion, not medical advice.': 'ผลการตรวจจับไม่ใช่การฟื้นตัวของร่างกาย นี่เป็นคำแนะนำการฝึก ไม่ใช่คำแนะนำทางการแพทย์',
    'Starting check done.': 'ทดสอบเริ่มต้นเสร็จแล้ว', 'You felt uncomfortable.': 'คุณรู้สึกไม่สบาย', 'Tired or stopped early twice.': 'เหนื่อยหรือหยุดก่อนกำหนด 2 ครั้ง',
    // Levels and plan
    'Beginner': 'ผู้เริ่มต้น', 'Building': 'กำลังพัฒนา', 'Steady': 'สม่ำเสมอ', 'Finding your starting point.': 'กำลังหาจุดเริ่มต้นของคุณ',
    'Your level, your week, and how you’re doing.': 'ระดับ สัปดาห์ และผลการฝึกของคุณ', 'Start with the beginner guide': 'เริ่มจากคู่มือเริ่มต้น',
    'It takes about 5 minutes. Your plan starts after that.': 'ใช้เวลาประมาณ 5 นาที แผนของคุณจะเริ่มหลังจากนั้น',
    'Current level': 'ระดับปัจจุบัน', 'Plan levels': 'ระดับของแผน', 'Per week': 'ต่อสัปดาห์', 'Sets': 'เซต', 'Length': 'ระยะเวลา',
    'Highest level': 'ระดับสูงสุด', 'Highest level reached.': 'ถึงระดับสูงสุดแล้ว', 'Sessions done': 'เซสชันที่ทำแล้ว', 'No tired days': 'ไม่มีวันที่เหนื่อย',
    'Good signal': 'สัญญาณดี', 'Feeling tired or uncomfortable often moves you back a level.': 'หากเหนื่อยหรือไม่สบายบ่อย แผนจะลดลงหนึ่งระดับ',
    'Level changes': 'การเปลี่ยนระดับ', 'None yet.': 'ยังไม่มี', 'Previous week': 'สัปดาห์ก่อน', 'Next week': 'สัปดาห์หน้า',
    'Tap a day to see its results.': 'แตะวันที่เพื่อดูผล', 'Training calendar': 'ปฏิทินการฝึก', 'Completed': 'เสร็จแล้ว', 'Today': 'วันนี้',
    'Upcoming': 'กำลังจะมา', 'Rested': 'พักแล้ว', 'Rested or rest day': 'พักหรือวันพัก', 'Stopped early': 'หยุดก่อนกำหนด', 'Before start': 'ก่อนเริ่ม',
    'Rest taken instead': 'พักแทนการฝึก', 'Recognized': 'ตรวจจับได้', 'Overall': 'รวม', 'Finished': 'ฝึกครบ', 'Check-in': 'เช็กอิน', 'Level': 'ระดับ',
    'No session. Rest taken instead.': 'ไม่มีเซสชัน พักแทนการฝึก', 'Rest day. No session planned.': 'วันพัก ไม่มีเซสชันในแผน',
    'Before you started NeuroHand.': 'ก่อนที่คุณจะเริ่มใช้ NeuroHand', 'Not answered': 'ไม่ได้ตอบ', 'No session.': 'ไม่มีเซสชัน',
    'How you’re doing': 'ผลการฝึกของคุณ', 'Sessions': 'เซสชัน', 'Tired days': 'วันที่เหนื่อย', 'See all results on Progress': 'ดูผลทั้งหมดในหน้าความก้าวหน้า',
    'Safety limits': 'ขีดจำกัดความปลอดภัย', 'Your plan never goes above these.': 'แผนของคุณจะไม่เกินค่าเหล่านี้', 'No training when uncomfortable': 'ไม่ฝึกเมื่อรู้สึกไม่สบาย',
    'Your results are saved in this browser to build your plan.': 'ผลของคุณบันทึกไว้ในเบราว์เซอร์นี้เพื่อสร้างแผน',
    'Delete my data': 'ลบข้อมูลของฉัน', 'Delete everything and start over?': 'ลบทั้งหมดแล้วเริ่มใหม่?', 'Delete': 'ลบ', 'Cancel': 'ยกเลิก',
    'Demo controls': 'ตัวควบคุมข้อมูลตัวอย่าง', 'For testing only.': 'สำหรับทดสอบเท่านั้น', 'Load demo history': 'โหลดประวัติตัวอย่าง',
    'Reset today’s check-in': 'รีเซ็ตเช็กอินวันนี้', 'Updated': 'อัปเดตแล้ว', 'Recent': 'ล่าสุด',
    'Results vary a lot. Check the headset fit.': 'ผลแตกต่างกันมาก ลองตรวจการสวมเฮดเซ็ต', 'About the same as when you started.': 'ใกล้เคียงกับตอนเริ่มต้น',
    // Progress
    'Show': 'แสดง', 'All sessions': 'ทุกเซสชัน', 'Last 5 sessions': '5 เซสชันล่าสุด', 'Last 3 sessions': '3 เซสชันล่าสุด', 'Export report': 'ส่งออกรายงาน',
    'Results appear after your first session.': 'ผลจะแสดงหลังเซสชันแรก', 'Training time': 'เวลาฝึก', 'Recognition by session': 'การตรวจจับในแต่ละเซสชัน',
    'Chance level': 'ระดับสุ่ม', 'Left and right hand': 'มือซ้ายและขวา', 'Now vs. when you started.': 'ตอนนี้เทียบกับตอนเริ่ม', 'At start': 'ตอนเริ่ม',
    'Session history': 'ประวัติเซสชัน', 'Left': 'ซ้าย', 'Right': 'ขวา', 'Poor signal': 'สัญญาณไม่ดี', 'Researcher notes': 'บันทึกของนักวิจัย',
    'Notes about this participant': 'บันทึกเกี่ยวกับผู้เข้าร่วมคนนี้', 'Save note': 'บันทึก', 'Saved': 'บันทึกแล้ว',
    // Training
    'Session 9 · left and right hand imagery': 'เซสชัน 9 · จินตนาการมือซ้ายและขวา', 'Full screen': 'เต็มจอ', 'End session': 'จบเซสชัน',
    'NeuroHand EEG headset connected': 'เชื่อมต่อเฮดเซ็ต EEG NeuroHand แล้ว', 'Change device': 'เปลี่ยนอุปกรณ์',
    'Paused': 'หยุดชั่วคราว', 'In progress': 'กำลังฝึก', 'Stopped': 'หยุดแล้ว', 'Imagine closing your': 'จินตนาการว่ากำ', 'left hand': 'มือซ้าย', 'right hand': 'มือขวา',
    'Left hand, closed': 'มือซ้าย กำอยู่', 'Right hand, open': 'มือขวา แบอยู่', 'Recognized as': 'ตรวจจับเป็น',
    'Start training': 'เริ่มฝึก', 'Pause': 'หยุดชั่วคราว', 'Skip trial': 'ข้ามครั้งนี้', 'EEG signal': 'สัญญาณ EEG', 'last 2 s ·': '2 วินาทีล่าสุด ·',
    'EEG traces for C3, Cz and C4': 'กราฟสัญญาณ EEG ของ C3, Cz และ C4', 'Classifier output': 'ผลการจำแนก', 'The hand moves when output is above 0.60.': 'มือจะขยับเมื่อค่าเกิน 0.60',
    'Today:': 'วันนี้:', 'Do the beginner guide first.': 'ทำคู่มือเริ่มต้นก่อน', 'Open guide': 'เปิดคู่มือ',
    'Training simulation': 'การฝึกจำลอง', 'Stop session': 'หยุดเซสชัน', 'Resume': 'ทำต่อ', 'Relax and look at the cross': 'ผ่อนคลายและมองที่เครื่องหมายบวก',
    'Not recognized': 'ตรวจจับไม่ได้', 'Time to rest': 'ได้เวลาพัก', 'Relax your hands and breathe slowly.': 'ผ่อนคลายมือและหายใจช้าๆ',
    'Resting…': 'กำลังพัก…', 'Stop for today': 'หยุดวันนี้', 'Tired? It’s fine to stop.': 'เหนื่อยไหม? หยุดได้เลย', 'Session complete': 'จบเซสชันแล้ว',
    'Well done': 'เยี่ยมมาก', 'Close': 'ปิด', 'Paused. Press Resume to continue.': 'หยุดชั่วคราว กด "ทำต่อ" เพื่อฝึกต่อ',
    'Space or tap to pause · Esc to stop': 'กด Space หรือแตะเพื่อหยุดชั่วคราว · Esc เพื่อหยุด',
    // Device
    'Connect your headset': 'เชื่อมต่อเฮดเซ็ต', 'Training needs a connected EEG headset. Turn it on and keep it within a few meters of this computer.': 'การฝึกต้องเชื่อมต่อเฮดเซ็ต EEG เปิดเครื่องและวางไว้ใกล้คอมพิวเตอร์ในระยะไม่กี่เมตร',
    'No headset connected': 'ยังไม่ได้เชื่อมต่อเฮดเซ็ต', 'Make sure Bluetooth is on, then search for nearby devices.': 'เปิดบลูทูธ แล้วค้นหาอุปกรณ์ใกล้เคียง',
    'Search for devices': 'ค้นหาอุปกรณ์', 'Searching for devices': 'กำลังค้นหาอุปกรณ์', 'Looking for EEG headsets nearby. This takes a few seconds.': 'กำลังหาเฮดเซ็ต EEG ใกล้เคียง ใช้เวลาไม่กี่วินาที',
    'NeuroHand EEG headset': 'เฮดเซ็ต EEG NeuroHand', 'NH-01 · Bluetooth · simulated': 'NH-01 · บลูทูธ · จำลอง', 'Connect': 'เชื่อมต่อ',
    'Before you connect': 'ก่อนเชื่อมต่อ', 'Charge the headset if the light is orange.': 'ชาร์จเฮดเซ็ตหากไฟเป็นสีส้ม', 'Turn on Bluetooth on this computer.': 'เปิดบลูทูธบนคอมพิวเตอร์นี้',
    'Put the headset on so C3, Cz and C4 sit over the top of the head.': 'สวมเฮดเซ็ตให้ C3, Cz และ C4 อยู่บนศีรษะ',
    'No hardware yet? Choose the simulated headset to try training with generated data.': 'ยังไม่มีอุปกรณ์? เลือกเฮดเซ็ตจำลองเพื่อลองฝึกด้วยข้อมูลที่สร้างขึ้น',
    'Not connected': 'ยังไม่เชื่อมต่อ', 'No headset': 'ไม่มีเฮดเซ็ต',
    // Settings
    'Change how NeuroHand looks.': 'ปรับหน้าตาของ NeuroHand', 'Color mode': 'โหมดสี', 'Pick a look, or match your device.': 'เลือกแบบที่ชอบ หรือใช้ตามอุปกรณ์',
    'Light': 'สว่าง', 'White background': 'พื้นหลังสีขาว', 'Dark': 'มืด', 'Dark background': 'พื้นหลังสีเข้ม', 'Walnut': 'วอลนัท',
    'Warm wood, like the training scene': 'โทนไม้อบอุ่น เหมือนฉากฝึก', 'System': 'ตามระบบ', 'Matches your device': 'ใช้ตามอุปกรณ์ของคุณ',
    'Text size': 'ขนาดตัวอักษร', 'Larger text is easier to read.': 'ตัวอักษรใหญ่ขึ้นอ่านง่ายขึ้น', 'Default': 'ปกติ', 'Large': 'ใหญ่',
    'A student research project': 'โครงงานวิจัยของนักศึกษา',
    'About 5 minutes.': 'ประมาณ 5 นาที',
    'Before you started.': 'ก่อนเริ่มใช้งาน',
    'Brain-computer training for stroke rehabilitation. Uses simulated data for now.': 'การฝึกด้วยสมองเพื่อฟื้นฟูผู้ป่วยโรคหลอดเลือดสมอง ตอนนี้ใช้ข้อมูลจำลอง',
    'Connect headset': 'เชื่อมต่อเฮดเซ็ต',
    'Delete everything?': 'ลบทั้งหมด?',
    'Do the guide first': 'ทำคู่มือก่อน',
    'Feel unwell? See a doctor.': 'ไม่สบาย? ไปพบแพทย์',
    'Finish': 'เสร็จสิ้น',
    'Get started': 'เริ่มต้นใช้งาน',
    'Guide': 'คู่มือ',
    'Hold your breath': 'กลั้นหายใจ',
    'How do you feel?': 'วันนี้รู้สึกอย่างไร?',
    'Imagine moving your hand. A virtual hand moves with you.': 'จินตนาการว่าขยับมือ แล้วมือเสมือนจะขยับตาม',
    'Imagine moving your hand. The virtual hand moves with you.': 'จินตนาการว่าขยับมือ แล้วมือเสมือนจะขยับตาม',
    'Imagine squeezing': 'จินตนาการว่ากำมือ',
    'Keep your real hand still.': 'มือจริงอยู่นิ่งๆ',
    'Left vs. right': 'ซ้ายเทียบขวา',
    'No training today.': 'วันนี้ไม่ต้องฝึก',
    'No training when unwell': 'ไม่ฝึกเมื่อไม่สบาย',
    'Not a medical device.': 'ไม่ใช่อุปกรณ์ทางการแพทย์',
    'Not medical advice.': 'ไม่ใช่คำแนะนำทางการแพทย์',
    'One session a day.': 'วันละหนึ่งเซสชัน',
    'Opens full screen. Pause or stop anytime.': 'เปิดแบบเต็มจอ หยุดได้ทุกเมื่อ',
    'Place C3, Cz and C4 on top of your head.': 'วาง C3, Cz และ C4 บนศีรษะ',
    'Planned session.': 'มีเซสชันตามแผน',
    'Poor signal: results won’t count.': 'สัญญาณไม่ดี: ไม่นับผล',
    'Practice': 'ฝึกซ้อม',
    'Relax': 'ผ่อนคลาย',
    'Relax and breathe.': 'ผ่อนคลายและหายใจ',
    'Rest day.': 'วันพัก',
    'Rest for today.': 'พักได้เลยวันนี้',
    'Results': 'ผลลัพธ์',
    'Save my results to build my plan.': 'บันทึกผลของฉันเพื่อสร้างแผน',
    'Search': 'ค้นหา',
    'Searching…': 'กำลังค้นหา…',
    'See all': 'ดูทั้งหมด',
    'See the hand move': 'ดูมือขยับ',
    'Shorter today.': 'วันนี้ฝึกสั้นลง',
    'Simulated': 'จำลอง',
    'Start guide': 'เริ่มคู่มือ',
    'Start session': 'เริ่มฝึก',
    'Start with a 5-minute guide.': 'เริ่มด้วยคู่มือ 5 นาที',
    'Start with the guide': 'เริ่มจากคู่มือ',
    'Still unwell? See a doctor.': 'ยังไม่สบาย? ไปพบแพทย์',
    'Stop anytime if you feel tired or unwell.': 'หยุดได้ทุกเมื่อหากเหนื่อยหรือไม่สบาย',
    'Stop anytime.': 'หยุดได้ทุกเมื่อ',
    'Student research prototype. Not a medical device.': 'ต้นแบบงานวิจัยของนักศึกษา ไม่ใช่อุปกรณ์ทางการแพทย์',
    'Tap a day for details.': 'แตะวันที่เพื่อดูรายละเอียด',
    'Tap to pause': 'แตะเพื่อหยุดชั่วคราว',
    'Time': 'เวลา',
    'Tired? It’s OK to stop.': 'เหนื่อยไหม? หยุดได้เลย',
    'Today’s plan': 'แผนวันนี้',
    'Train your hand with your mind.': 'ฝึกมือด้วยความคิดของคุณ',
    'Try demo': 'ลองตัวอย่าง',
    'Turn it on and keep it close.': 'เปิดเครื่องและวางไว้ใกล้ๆ',
    'Turn on Bluetooth, then search.': 'เปิดบลูทูธ แล้วค้นหา',
    'View plan': 'ดูแผน',
    'Wear the headset': 'สวมเฮดเซ็ต',
    'Week': 'สัปดาห์',
    'Welcome': 'ยินดีต้อนรับ',
    'Welcome!': 'ยินดีต้อนรับ!',
    'Why this plan?': 'ทำไมแผนนี้?',
    'You feel tired: shorter session.': 'คุณเหนื่อย: ฝึกสั้นลง',
    'Your right hand gets extra practice.': 'มือขวาได้ฝึกเพิ่ม',
    'Your left hand gets extra practice.': 'มือซ้ายได้ฝึกเพิ่ม',
    'More right-hand practice.': 'ฝึกมือขวาเพิ่ม',
    'More left-hand practice.': 'ฝึกมือซ้ายเพิ่ม',
    '[Photo]': '[รูปภาพ]',
    'Go to today’s plan': 'ไปที่แผนวันนี้',
    '3 short sessions find your starting point.': 'เซสชันสั้นๆ 3 ครั้งเพื่อหาจุดเริ่มต้น',
    'Paused': 'หยุดชั่วคราว',
    'Language': 'ภาษา', 'None': 'ไม่มี', 'Choose the language for NeuroHand.': 'เลือกภาษาของ NeuroHand'
  };

  // ---------- Patterns for text that contains numbers or data ----------
  const hand = (h) => ({ left: 'ซ้าย', right: 'ขวา', both: 'ทั้งสองข้าง' }[h] || h);
  const P = [
    [/^(\d+) device found$/, 'พบ $1 อุปกรณ์'],
    [/^(\d+) sessions?$/, '$1 เซสชัน'],
    [/^(Rest day|Done for today|Rest today|Stopped early)\. (.+)$/, (m, a, b) => (tr(a) || a) + ' ' + (tr(b) || b)],
    [/^(Rest day|Done for today|Rest today|Stopped early)\.$/, (m, a) => tr(a) || a],
    [/^(\d+) of (\d+) recognized( \(demo\))?\.$/, (m, a, b, d) => 'ตรวจจับได้ ' + a + ' จาก ' + b + (d ? ' (ตัวอย่าง)' : '')],
    [/^(.+?) signal is poor\.$/, 'สัญญาณ $1 ไม่ดี'],
    [/^(.+?) signal is weak\.$/, 'สัญญาณ $1 อ่อน'],
    [/^Recent: left (\S+)%, right (\S+)%\.$/, 'ล่าสุด: ซ้าย $1% ขวา $2%'],
    [/^(.+?) · (\d+) × (\d+) · (\d+) min$/, (m, f, a, b, c) => (tr(f) || f) + ' · ' + a + ' × ' + b + ' · ' + c + ' นาที'],
    [/^Up from (\d+)% to (\d+)%\.$/, 'เพิ่มจาก $1% เป็น $2%'],
    [/^Down from (\d+)% to (\d+)%\. Check the headset fit\.$/, 'ลดจาก $1% เป็น $2% ลองตรวจการสวมเฮดเซ็ต'],
    [/^(\d+) left out \(poor signal\)\.$/, 'ไม่นับ $1 เซสชัน (สัญญาณไม่ดี)'],
    [/^(\d+) × (\d+)$/, '$1 × $2'],
    [/^(\d+) h (\d+) min$/, '$1 ชม. $2 นาที'],
    [/^(\d+) min$/, '$1 นาที'],
    [/^(\d+) min total$/, 'รวม $1 นาที'],
    [/^(\d+) of (\d+)$/, '$1 จาก $2'],
    [/^(\d+) of (\d+) done$/, 'เสร็จ $1 จาก $2'],
    [/^(\d+) of (\d+) recognized( \(demo\))?\. Rest now\.$/, (m, a, b, d) => 'ตรวจจับได้ ' + a + ' จาก ' + b + ' ครั้ง' + (d ? ' (ตัวอย่าง)' : '') + ' พักได้เลย'],
    [/^(\d+) recently$/, 'ล่าสุด $1 ครั้ง'],
    [/^(\d+) s$/, '$1 วินาที'],
    [/^(\d+) sessions? left out \(poor signal\)\.$/, 'ไม่นับ $1 เซสชัน (สัญญาณไม่ดี)'],
    [/^(\d+) sessions? since (\d+) (\w+)$/, (m, n, d, mo) => n + ' เซสชัน ตั้งแต่ ' + d + ' ' + (MONTHS[mo] || mo)],
    [/^(\d+) sessions a week, (\d+) sets each\.$/, 'สัปดาห์ละ $1 เซสชัน เซสชันละ $2 เซต'],
    [/^(\d+) sessions a week\.$/, 'สัปดาห์ละ $1 เซสชัน'],
    [/^(\d+) sessions a week\. The highest level\.$/, 'สัปดาห์ละ $1 เซสชัน ระดับสูงสุด'],
    [/^(\d+) sets?$/, '$1 เซต'],
    [/^(\d+) short sessions help NeuroHand learn your starting point\.$/, 'เซสชันสั้นๆ $1 ครั้งช่วยให้ NeuroHand รู้จุดเริ่มต้นของคุณ'],
    [/^(\d+) trials?$/, '$1 ครั้ง'],
    [/^× (\d+) trials$/, '× $1 ครั้ง'],
    [/^(\d+)% confidence$/, 'ความมั่นใจ $1%'],
    [/^, (\d+)% confidence$/, ', ความมั่นใจ $1%'],
    [/^([+-]?\d+) since start$/, '$1 จากตอนเริ่ม'],
    [/^A fair (.+?) signal may lower (left|right|both)-hand(?: and (left|right|both)-hand)? results\.$/, (m, e, h1) => 'สัญญาณ ' + e + ' ระดับพอใช้ อาจทำให้ผลของมือ' + hand(h1) + 'ต่ำลง'],
    [/^About (\d+) min · (\d+) sets?$/, 'ประมาณ $1 นาที · $2 เซต'],
    [/^Average (\d+)% or more$/, 'เฉลี่ย $1% ขึ้นไป'],
    [/^Average (\d+)% over (\d+) sessions\.$/, 'เฉลี่ย $1% ใน $2 เซสชัน'],
    [/^(.+?) signal is fair\. Adjust the headset for better results\.$/, 'สัญญาณ $1 พอใช้ ปรับเฮดเซ็ตเพื่อผลที่ดีขึ้น'],
    [/^(.+?) signal is poor\. Check the headset first\.$/, 'สัญญาณ $1 ไม่ดี ตรวจเฮดเซ็ตก่อน'],
    [/^(C\d|Cz) signal quality$/, 'คุณภาพสัญญาณ $1'],
    [/^Good evening, (P-\d+)$/, 'สวัสดีตอนเย็น $1'],
    [/^L (\S+) · R (\S+)$/, 'ซ้าย $1 · ขวา $2'],
    [/^Level: ([^.]+)(?:\.(?: (.+))?)?$/, (m, n, rest) => 'ระดับ: ' + (tr(n) || n) + (rest ? ' ' + (tr(rest) || rest) : '')],
    [/^Max (\d+) min a session$/, 'สูงสุด $1 นาทีต่อเซสชัน'],
    [/^Max (\d+) sessions a week$/, 'สูงสุด $1 เซสชันต่อสัปดาห์'],
    [/^Max (\d+) sets of (\d+) trials$/, 'สูงสุด $1 เซต เซตละ $2 ครั้ง'],
    [/^Min (\d+) s rest between sets$/, 'พักระหว่างเซตอย่างน้อย $1 วินาที'],
    [/^Next: (.+)$/, (m, x) => 'ถัดไป: ' + (tr(x) || x).replace(/\.$/, '')],
    [/^Planned: about (\d+) min, (\d+) × (\d+) trials\.$/, 'แผน: ประมาณ $1 นาที, $2 × $3 ครั้ง'],
    [/^Today’s session: about (\d+) min, (\d+) × (\d+) trials\.$/, 'เซสชันวันนี้: ประมาณ $1 นาที, $2 × $3 ครั้ง'],
    [/^Recent recognition: left (\S+)%, right (\S+)%\.$/, 'การตรวจจับล่าสุด: ซ้าย $1%, ขวา $2%'],
    [/^Recognition by session, from (\d+)% in session (\d+) to (\d+)% in session (\d+)$/, 'การตรวจจับในแต่ละเซสชัน จาก $1% ในเซสชัน $2 เป็น $3% ในเซสชัน $4'],
    [/^(.+?) · (\d+) × (\d+) trials · about (\d+) min$/, (m, f, a, b, c) => (tr(f) || f) + ' · ' + a + ' × ' + b + ' ครั้ง · ประมาณ ' + c + ' นาที'],
    [/^Session (\d+)$/, 'เซสชัน $1'],
    [/^Session (\d+) of (\d+)$/, 'เซสชัน $1 จาก $2'],
    [/^Set (\d+) of (\d+) complete$/, 'เซต $1 จาก $2 เสร็จแล้ว'],
    [/^Set (\d+) of (\d+) · Trial (\d+) of (\d+)$/, 'เซต $1/$2 · ครั้งที่ $3/$4'],
    [/^Start set (\d+)$/, 'เริ่มเซต $1'],
    [/^Starting check: (\d+) of (\d+) done\.$/, 'ทดสอบเริ่มต้น: เสร็จ $1 จาก $2'],
    [/^Step (\d+) of (\d+)$/, 'ขั้นตอน $1 จาก $2'],
    [/^This week: (\d+) of (\d+) done\.$/, 'สัปดาห์นี้: เสร็จ $1 จาก $2'],
    [/^Trial (\d+) of (\d+)$/, 'ครั้งที่ $1 จาก $2'],
    [/^Up from (\d+)% to (\d+)% since you started\.$/, 'เพิ่มจาก $1% เป็น $2% ตั้งแต่เริ่ม'],
    [/^Down from (\d+)% to (\d+)%\. Tiredness or headset fit can cause this\.$/, 'ลดจาก $1% เป็น $2% อาจเกิดจากความเหนื่อยหรือการสวมเฮดเซ็ต'],
    [/^Usually (\d+) min$/, 'ปกติ $1 นาที'],
    [/^You feel tired: (\d+) set fewer, longer rests\.$/, 'คุณเหนื่อย: ลด $1 เซต และพักนานขึ้น'],
    [/^Your (left|right) hand gets extra practice \((\d+)% vs (\d+)%\)\.$/, (m, h, a, b) => 'มือ' + hand(h) + 'ได้ฝึกเพิ่ม (' + a + '% เทียบกับ ' + b + '%)'],
    [/^last (\d+)$/, 'ล่าสุด $1'],
    [/^of (\d+) sessions$/, 'จาก $1 เซสชัน'],
    [/^(No session today\.|This week’s sessions are done\.)(?: Next: (\w+)\.)?$/, (m, a, d) => (a.startsWith('No') ? 'วันนี้ไม่มีเซสชัน' : 'เซสชันของสัปดาห์นี้ครบแล้ว') + (d ? ' ครั้งถัดไป: ' + (DAYS[d] || d) : '')],
    [/^(.+) → (.+)$/, (m, a, b) => (tr(a) || a) + ' → ' + (tr(b) || b)],
    // Calendar day labels: "Monday 26 October: Completed, L 70% · R 64%. Open details"
    [/^((?:[A-Z][a-z]+day) \d+ [A-Z][a-z]+): ([^,.]+)(?:, (.+?))?(\. Open details)?$/, (m, d, st, meta, open) => dateTh(d) + ': ' + (tr(st) || st) + (meta ? ', ' + (tr(meta) || meta) : '') + (open ? ' เปิดรายละเอียด' : '')]
  ];

  // ---------- Translation ----------
  function tr(raw) {
    const k = raw.replace(/\s+/g, ' ').trim();
    if (!k) return null;
    if (Object.prototype.hasOwnProperty.call(D, k)) return D[k];
    for (const [re, rep] of P) { if (re.test(k)) return k.replace(re, rep); }
    if (DATE_ONLY.test(k)) return dateTh(k);
    return null;
  }
  NH.t = (s) => tr(s) || s;
  const ATTRS = ['aria-label', 'placeholder', 'title'];
  const doText = (n) => {
    const v = n.nodeValue;
    const r = tr(v);
    if (r == null) return;
    const out = v.match(/^\s*/)[0] + r + v.match(/\s*$/)[0];
    if (out !== v) n.nodeValue = out;
  };
  const doEl = (el) => {
    ATTRS.forEach((a) => { const v = el.getAttribute && el.getAttribute(a); if (v) { const r = tr(v); if (r != null && r !== v) el.setAttribute(a, r); } });
  };
  const walk = (node) => {
    if (node.nodeType === 3) { if (!/^(SCRIPT|STYLE)$/.test(node.parentNode && node.parentNode.nodeName)) doText(node); return; }
    if (node.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(node.nodeName)) return;
    doEl(node);
    const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) { if (!/^(SCRIPT|STYLE)$/.test(n.parentNode.nodeName)) doText(n); } else doEl(n);
    }
  };
  const doTitle = () => { const r = tr(document.title); if (r && r !== document.title) document.title = r; };

  walk(document.body);
  doTitle();
  root.classList.remove('nh-i18n-wait');

  // Keep translating anything the app changes while it runs
  new MutationObserver((list) => {
    list.forEach((m) => {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doEl(m.target);
      else m.addedNodes.forEach(walk);
    });
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  const titleEl = document.querySelector('title');
  if (titleEl) new MutationObserver(doTitle).observe(titleEl, { childList: true, characterData: true, subtree: true });
})();
