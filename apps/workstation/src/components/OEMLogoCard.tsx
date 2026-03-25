import React, { useState } from 'react';
import { OEM_BRANDS, getOEMBrand, getAllGroups, type OEMBrand } from '../data/oem-logos';

interface OEMLogoCardProps {
  brandId: string;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const OEMLogoCard = ({ brandId, selected, onClick, size = 'md' }: OEMLogoCardProps) => {
  const brand = getOEMBrand(brandId);
  const [imgError, setImgError] = useState(false);

  if (!brand) return null;

  const sizes = {
    sm: { card: 80, img: 32, fontSize: 8 },
    md: { card: 100, img: 44, fontSize: 9 },
    lg: { card: 120, img: 56, fontSize: 10 },
  };
  const s = sizes[size];

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: s.card,
        height: s.card,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 10,
        cursor: onClick ? 'pointer' : 'default',
        border: `1.5px solid ${selected ? brand.primaryColor : '#E5E5EA'}`,
        background: selected ? brand.primaryColor + '12' : '#fff',
        transition: 'all 0.15s ease',
        padding: 8,
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      {brand.logoUrl && !imgError ? (
        <img
          src={brand.logoUrl}
          alt={brand.name}
          style={{ width: s.img, height: s.img, objectFit: 'contain' }}
          onError={() => setImgError(true)}
        />
      ) : (
        // Fallback: initialer i färgad cirkel
        <div
          style={{
            width: s.img,
            height: s.img,
            borderRadius: '50%',
            background: brand.primaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: brand.textColor,
            fontWeight: 700,
            fontSize: s.img * 0.35,
          }}
        >
          {brand.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div
        style={{
          fontSize: s.fontSize,
          fontWeight: 600,
          color: selected ? brand.primaryColor : '#86868B',
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {brand.name}
      </div>
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: brand.primaryColor,
            color: '#fff',
            fontSize: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
          }}
        >
          ✓
        </div>
      )}
    </div>
  );
};

// OEM Logo grid för onboarding — grupperat per tillverkare
interface OEMLogoGridProps {
  selected: string[];
  onToggle: (id: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export const OEMLogoGrid = ({ selected, onToggle, size = 'sm' }: OEMLogoGridProps) => {
  const groups = getAllGroups();

  return (
    <div>
      {groups.map(group => (
        <div key={group} style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#86868B',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            {group}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {OEM_BRANDS.filter(b => b.group === group).map(brand => (
              <OEMLogoCard
                key={brand.id}
                brandId={brand.id}
                selected={selected.includes(brand.id)}
                onClick={() => onToggle(brand.id)}
                size={size}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Enkel OEM-badge för visning (t.ex. i verkstadsprofil)
interface OEMBadgeProps {
  brandId: string;
  showName?: boolean;
}

export const OEMBadge = ({ brandId, showName = true }: OEMBadgeProps) => {
  const brand = getOEMBrand(brandId);
  const [imgError, setImgError] = useState(false);

  if (!brand) return null;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 20,
        background: brand.primaryColor + '15',
        border: `1px solid ${brand.primaryColor}40`,
      }}
    >
      {brand.logoUrl && !imgError ? (
        <img
          src={brand.logoUrl}
          alt={brand.name}
          style={{ width: 18, height: 18, objectFit: 'contain' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: brand.primaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: brand.textColor,
            fontWeight: 700,
            fontSize: 7,
          }}
        >
          {brand.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      {showName && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: brand.primaryColor,
          }}
        >
          {brand.name}
        </span>
      )}
    </div>
  );
};

export default OEMLogoCard;
