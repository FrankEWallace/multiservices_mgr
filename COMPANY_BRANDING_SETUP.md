# 🎨 Company Branding Setup Guide

## ✅ What's Been Fixed

### 1. **Company Settings Now in Database**
All 8 company branding settings have been added to your database:
- ✅ company.name
- ✅ company.tagline
- ✅ company.email
- ✅ company.phone
- ✅ company.address
- ✅ company.website
- ✅ company.taxId
- ✅ company.logo (NEW!)

### 2. **Logo Upload Feature Added**
You can now upload your company logo with:
- 📸 Image file upload (PNG, JPG, SVG)
- 👁️ Live preview of uploaded logo
- 🗑️ Remove button to delete logo
- 🔄 Automatic fallback to company initials if no logo

### 3. **Dynamic Sidebar**
The sidebar now displays:
- 🏢 Company name from settings (not hardcoded)
- 🖼️ Company logo (if uploaded)
- 📝 Company initials (if no logo)
- 💬 Company tagline below name

---

## 🚀 How to Use

### Step 1: Access Settings
1. Click on **Settings** in the sidebar
2. You'll see the **Company Branding** section at the top (highlighted with blue border)

### Step 2: Update Company Name
1. Change **Company Name** field (currently "Meilleur Business Services")
2. Click **Save Changes** button (appears in top right)
3. **Refresh the page** to see the new name in the sidebar

### Step 3: Upload Company Logo
1. In the **Company Logo** field, click **Choose File**
2. Select your logo image (PNG, JPG, or SVG recommended)
3. You'll see a preview of the logo immediately
4. Click **Save Changes**
5. **Refresh the page** - your logo now appears in the sidebar!

### Step 4: Complete Other Branding Info
- Tagline/Slogan
- Company Email
- Company Phone
- Company Address
- Website
- Tax ID/TIN

All these appear in reports and exports.

---

## 📸 What You'll See

### In Settings Page:
```
┌─────────────────────────────────────────┐
│  🏢 Company Branding                    │
├─────────────────────────────────────────┤
│  Company Name: [Your Company Name]      │
│  Tagline: [Your Tagline]                │
│  Email: [Your Email]                    │
│  Phone: [Your Phone]                    │
│  Logo: [Upload button + Preview]        │
│  ...more fields...                      │
│                  [Save Changes] button  │
└─────────────────────────────────────────┘
```

### In Sidebar (No Logo):
```
┌──────────────┐
│   ┌────┐     │
│   │ AC │  Acme Corporation           │
│   └────┘  Excellence in Service      │
└──────────────┘
```

### In Sidebar (With Logo):
```
┌──────────────┐
│  ┌─────┐     │
│  │[IMG]│  Acme Corporation           │
│  └─────┘  Excellence in Service      │
└──────────────┘
```

---

## 🔧 Technical Details

### Database Changes
```sql
-- 8 new settings added to the `settings` table
INSERT INTO settings (key, value, category, type, label, description, is_public)
VALUES 
  ('company.name', 'Meilleur Business Services', 'company', 'string', ...),
  ('company.tagline', 'Multi-Service Excellence', 'company', 'string', ...),
  ('company.email', 'info@meilleur.com', 'company', 'string', ...),
  ('company.phone', '+255 123 456 789', 'company', 'string', ...),
  ('company.address', '123 Business Street, Dar es Salaam', 'company', 'string', ...),
  ('company.website', 'https://www.meilleur.com', 'company', 'string', ...),
  ('company.taxId', '123-456-789', 'company', 'string', ...),
  ('company.logo', '', 'company', 'string', ...);
```

### File Changes
1. **Settings.tsx** - Added logo upload section with preview
2. **Sidebar.tsx** - Added logo display with fallback to initials
3. **SettingsContext.tsx** - Added `getCompanyLogo()` helper
4. **Database** - Inserted 8 company settings

### Logo Storage
- Logos are stored as **base64-encoded strings** in the database
- When you upload a file, it's automatically converted to base64
- No need for external file storage or URLs
- Works offline and in all deployments

---

## 🐛 Troubleshooting

### "Company name still shows 'Meilleur'"
**Solution:** 
1. Go to Settings → Company Branding
2. Change the **Company Name** field
3. Click **Save Changes** (wait for success toast)
4. **Refresh the page** (F5 or Cmd+R)

### "Logo doesn't appear after upload"
**Solution:**
1. Make sure you clicked **Save Changes** after uploading
2. Wait for the "Settings saved successfully" message
3. **Refresh the page**
4. Check browser console for errors (F12)

### "Logo shows broken image icon"
**Solution:**
- The image file might be corrupted
- Try a different image format (PNG usually works best)
- Use the **Remove** button and try uploading again
- If problem persists, leave logo empty - it will show company initials

### "Settings don't save"
**Solution:**
1. Check that backend server is running (`npm run dev` in backend folder)
2. Check browser console for API errors
3. Verify you're logged in
4. Try refreshing and logging in again

---

## 🎯 Best Practices

### Logo Guidelines:
- **Size**: 200x200px to 500x500px works best
- **Format**: PNG with transparent background (recommended)
- **File Size**: Keep under 500KB for fast loading
- **Aspect Ratio**: Square (1:1) looks best in the sidebar

### Company Name:
- Keep it concise (shows in limited space)
- Use official company name
- Avoid special characters that might break exports

### Tagline:
- Short and memorable (max 50 characters)
- Describes your business essence
- Optional but recommended

---

## ✨ Features Coming Soon

### Logo Enhancements:
- [ ] Logo in PDF reports
- [ ] Logo in email signatures
- [ ] Multiple logo sizes (favicon, header, footer)
- [ ] Logo color variants (light/dark mode)

### Additional Branding:
- [ ] Custom color schemes
- [ ] Brand guidelines
- [ ] Multiple languages
- [ ] Custom fonts

---

## 📞 Support

If you encounter any issues:
1. Check the backend logs for errors
2. Check browser console (F12)
3. Verify settings API: `curl http://localhost:3000/api/settings`
4. Check database: `sqlite3 backend/data/meilleur.db "SELECT * FROM settings WHERE key LIKE 'company.%'"`

---

**Last Updated**: February 4, 2026  
**Version**: 2.0.0  
**Author**: GitHub Copilot

---

## 🎉 Quick Test

Want to test right now? Try this:

1. Open **Settings** page
2. Change **Company Name** to "ACME Corporation"
3. Click **Save Changes**
4. Refresh page
5. Look at sidebar - it should now say "AC" (initials) and "ACME Corporation"!

Enjoy your fully customized business dashboard! 🚀
