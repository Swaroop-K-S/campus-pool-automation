import { Request, Response } from 'express';

export const importProfile = async (req: Request, res: Response) => {
  try {
    const { ssoId } = req.params;
    
    if (!ssoId) {
       return res.status(400).json({ success: false, error: 'SSO ID is required' });
    }

    // Generate deterministic mock data based on the ID for testing
    let hash = 0;
    for (let i = 0; i < ssoId.length; i++) {
      hash = ssoId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const branches = ['Computer Science', 'Information Science', 'Electronics & Communication', 'Mechanical Engineering'];
    const names = ['Rahul Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 'Karthik S', 'Ananya Gupta', 'Vikram Singh'];
    
    const branchChoice = branches[Math.abs(hash) % branches.length];
    const nameChoice = names[Math.abs(hash) % names.length];
    const cgpa = (7.0 + (Math.abs(hash) % 30) / 10).toFixed(2); // between 7.0 and 9.9
    const year = new Date().getFullYear();

    const mockProfile = {
       name: nameChoice,
       usn: ssoId.toUpperCase(),
       email: `${nameChoice.split(' ')[0].toLowerCase()}.${ssoId.toLowerCase()}@college.edu`,
       phone: '9' + Math.abs(hash * 123456789).toString().substring(0, 9).padEnd(9, '0'),
       branch: branchChoice,
       cgpa: cgpa,
       graduationYear: year,
       linkedin: `https://linkedin.com/in/${nameChoice.split(' ')[0].toLowerCase()}-${ssoId.toLowerCase()}`,
       github: `https://github.com/${nameChoice.split(' ')[0].toLowerCase()}${Math.abs(hash % 100)}`
    };

    // Simulate network delay to feel like a real SSO fetch
    setTimeout(() => {
      res.status(200).json({
        success: true,
        data: mockProfile
      });
    }, 600);
    
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
