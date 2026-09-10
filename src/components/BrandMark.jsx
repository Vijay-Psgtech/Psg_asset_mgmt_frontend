import logoImage from '../../assets/images/PSG.png.png';

export default function BrandMark({ compact = false }) {
  return <div className={`brand-mark ${compact ? 'brand-mark-compact' : ''}`} aria-label="PSG Asset">
    <img src={logoImage} alt="PSG Asset" className="brand-mark-logo" />
    <span className="brand-mark-copy"><strong>PSG <em>ASSET</em></strong><small>Inventory control</small></span>
  </div>;
}
