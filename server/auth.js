const googleSheets = require('./googleSheets');

/**
 * Validate user credentials against Google Sheets
  * @param {string} username
   * @param {string} password
    * @returns {Object|null} User object if valid, null if invalid
     */
     async function validateCredentials(username, password) {
       try {
           // Get all credentials from Google Sheets
               const credentials = await googleSheets.readCredentials();

                   // Find matching user
                       const user = credentials.find(
                             cred => 
                                     cred.username === username && 
                                             cred.password === password &&
                                                     cred.status === 'ACTIVE'
                                                         );

                                                             if (user) {
                                                                   return {
                                                                           username: user.username,
                                                                                   name: user.name,
                                                                                           role: user.role, // OWNER or ADMIN
                                                                                                 };
                                                                                                     }

                                                                                                         return null;
                                                                                                           } catch (error) {
                                                                                                               console.error('Error validating credentials:', error);
                                                                                                                   return null;
                                                                                                                     }
                                                                                                                     }

                                                                                                                     /**
                                                                                                                      * Middleware: Require authentication (any logged-in user)
                                                                                                                       */
                                                                                                                       function requireAuth(req, res, next) {
                                                                                                                         if (req.session && req.session.user) {
                                                                                                                             next();
                                                                                                                               } else {
                                                                                                                                   res.status(401).json({ error: 'Unauthorized - Please login' });
                                                                                                                                     }
                                                                                                                                     }

                                                                                                                                     /**
                                                                                                                                      * Middleware: Require ADMIN role (admin or owner)
                                                                                                                                       */
                                                                                                                                       function requireAdmin(req, res, next) {
                                                                                                                                         if (req.session && req.session.user) {
                                                                                                                                             const role = req.session.user.role;
                                                                                                                                                 if (role === 'ADMIN' || role === 'OWNER') {
                                                                                                                                                       next();
                                                                                                                                                           } else {
                                                                                                                                                                 res.status(403).json({ error: 'Forbidden - Admin access required' });
                                                                                                                                                                     }
                                                                                                                                                                       } else {
                                                                                                                                                                           res.status(401).json({ error: 'Unauthorized - Please login' });
                                                                                                                                                                             }
                                                                                                                                                                             }

                                                                                                                                                                             /**
                                                                                                                                                                              * Middleware: Require OWNER role (owner only)
                                                                                                                                                                               */
                                                                                                                                                                               function requireOwner(req, res, next) {
                                                                                                                                                                                 if (req.session && req.session.user) {
                                                                                                                                                                                     if (req.session.user.role === 'OWNER') {
                                                                                                                                                                                           next();
                                                                                                                                                                                               } else {
                                                                                                                                                                                                     res.status(403).json({ error: 'Forbidden - Owner access required' });
                                                                                                                                                                                                         }
                                                                                                                                                                                                           } else {
                                                                                                                                                                                                               res.status(401).json({ error: 'Unauthorized - Please login' });
                                                                                                                                                                                                                 }
                                                                                                                                                                                                                 }

                                                                                                                                                                                                                 /**
                                                                                                                                                                                                                  * Check if current user is owner
                                                                                                                                                                                                                   * @param {Object} req - Express request object
                                                                                                                                                                                                                    * @returns {boolean}
                                                                                                                                                                                                                     */
                                                                                                                                                                                                                     function isOwner(req) {
                                                                                                                                                                                                                       return req.session && req.session.user && req.session.user.role === 'OWNER';
                                                                                                                                                                                                                       }

                                                                                                                                                                                                                       /**
                                                                                                                                                                                                                        * Check if current user is admin or owner
                                                                                                                                                                                                                         * @param {Object} req - Express request object
                                                                                                                                                                                                                          * @returns {boolean}
                                                                                                                                                                                                                           */
                                                                                                                                                                                                                           function isAdmin(req) {
                                                                                                                                                                                                                             if (!req.session || !req.session.user) return false;
                                                                                                                                                                                                                               const role = req.session.user.role;
                                                                                                                                                                                                                                 return role === 'ADMIN' || role === 'OWNER';
                                                                                                                                                                                                                                 }

                                                                                                                                                                                                                                 /**
                                                                                                                                                                                                                                  * Get current user from session
                                                                                                                                                                                                                                   * @param {Object} req - Express request object
                                                                                                                                                                                                                                    * @returns {Object|null}
                                                                                                                                                                                                                                     */
                                                                                                                                                                                                                                     function getCurrentUser(req) {
                                                                                                                                                                                                                                       return req.session && req.session.user ? req.session.user : null;
                                                                                                                                                                                                                                       }

                                                                                                                                                                                                                                       module.exports = {
                                                                                                                                                                                                                                         validateCredentials,
                                                                                                                                                                                                                                           requireAuth,
                                                                                                                                                                                                                                             requireAdmin,
                                                                                                                                                                                                                                               requireOwner,
                                                                                                                                                                                                                                                 isOwner,
                                                                                                                                                                                                                                                   isAdmin,
                                                                                                                                                                                                                                                     getCurrentUser,
                                                                                                                                                                                                                                                     };