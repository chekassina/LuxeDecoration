import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Product } from '../types';
import { MessageCircle, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Products = () => {
  const { language, t } = useLanguage();
  const isEn = language === 'en';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch products from our API (which connects to the database)
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
        }
      } catch (error) {
        console.error("Failed to fetch products", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-light text-white tracking-tight mb-4">{t('nav.products')}</h1>
          <div className="h-px w-20 bg-gold"></div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map((product) => (
              <div 
                key={product.id}
                className="bg-zinc-900 border border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden flex flex-col group"
              >
                <div className="relative h-64 overflow-hidden bg-black">
                  <img src={product.imageUrl} alt={isEn ? product.nameEn : product.nameFr} className="w-full h-full object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-500" />
                  <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
                    {product.badges?.map((badge, i) => (
                      <span key={i} className="bg-black/80 backdrop-blur-md border border-white/10 text-[10px] text-gold font-bold uppercase tracking-widest px-3 py-1">
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col bg-[#111]">
                  <h3 className="text-lg font-medium text-white leading-tight mb-2 flex-1">
                    {isEn ? product.nameEn : product.nameFr}
                  </h3>
                  
                  <div className="text-xl font-serif italic text-gold mb-6">
                    {product.priceFcfa.toLocaleString()} FCFA
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <a href={`https://wa.me/237674871651?text=Hello,%20I%20am%20interested%20in%20${isEn ? product.nameEn : product.nameFr}`} target="_blank" rel="noopener noreferrer" className="bg-[#25D366] hover:scale-105 text-white py-3 flex items-center justify-center transition-transform rounded-sm">
                      <MessageCircle className="w-5 h-5 fill-white" />
                    </a>
                    <Link to={`/product/${product.id}`} className="border border-white/20 hover:bg-white hover:text-black flex justify-center items-center py-3 text-[10px] font-bold uppercase tracking-widest transition-colors text-center rounded-sm text-white">
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
