import { Link } from "react-router-dom";

const Footer = () => {
  const footerLinks = [
    { label: "Sign In", href: "/login" },
    { label: "Get Started", href: "/register" },
    { label: "Admin Feedback", href: "/admin/login" },
  ];

  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src="/CODE.png" alt="CodeCampus" className="w-8 h-8 rounded-lg object-cover" />
              <span className="text-lg font-bold">CodeCampus</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              Where talent meets opportunity. The platform for campus hiring and coding collaboration.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CodeCampus. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
