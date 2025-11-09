import contactModel from '../Models/contactModel.js';

// List all contacts
export const listContacts = async (req, res) => {
  try {
    const contacts = await contactModel.find();
    res.status(200).json({ success: true, contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching contacts', error: error.message });
  }
};

// Create new contact
export const createContact = async (req, res) => {
  const { fullName, phoneNumber, emailAddress, address, dishName, yourQuery } = req.body;

  if (!fullName || !phoneNumber || !emailAddress || !address || !dishName || !yourQuery) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const newContact = new contactModel({
      fullName,
      phoneNumber,
      emailAddress,
      address,
      dishName,
      yourQuery,
    });

    await newContact.save();
    res.status(201).json({ success: true, message: 'Contact created successfully', contact: newContact });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating contact', error: error.message });
  }
};

// Edit contact details
export const editContact = async (req, res) => {
  const { id } = req.params;
  const { fullName, phoneNumber, emailAddress, address, dishName, yourQuery } = req.body;

  try {
    const contact = await contactModel.findById(id);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    if (fullName) contact.fullName = fullName;
    if (phoneNumber) contact.phoneNumber = phoneNumber;
    if (emailAddress) contact.emailAddress = emailAddress;
    if (address) contact.address = address;
    if (dishName) contact.dishName = dishName;
    if (yourQuery) contact.yourQuery = yourQuery;

    await contact.save();
    res.status(200).json({ success: true, message: 'Contact updated successfully', contact });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating contact', error: error.message });
  }
};

// Delete contact
export const deleteContact = async (req, res) => {
  const { id } = req.params;

  try {
    const contact = await contactModel.findByIdAndDelete(id);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }
    res.status(200).json({ success: true, message: 'Contact deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting contact', error: error.message });
  }
};
